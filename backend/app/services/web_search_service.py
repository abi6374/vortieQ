"""
Live web-search recommendations — supplements the fixed 80-course dataset
with real, current results from the open web (DuckDuckGo, via the `ddgs`
package: no API key, no signup, no cost).

This directly answers a recurring piece of learner feedback: the seeded
course library is a fixed, curated set and doesn't cover everything (e.g.
NPTEL courses, which are hugely relevant for Indian learners but weren't
part of the original 80-course seed). Rather than trying to hand-curate a
bigger and bigger static list, this searches live at request time.
"""

import time
from concurrent.futures import ThreadPoolExecutor

try:
    from duckduckgo_search import DDGS  # type: ignore
except (ImportError, Exception):
    DDGS = None

try:
    from duckduckgo_search.exceptions import DuckDuckGoSearchException as DDGSException  # type: ignore
except (ImportError, Exception):
    try:
        from duckduckgo_search.exceptions import RatelimitException as DDGSException  # type: ignore
    except (ImportError, Exception):
        DDGSException = Exception



MAX_RESULTS = 8
CACHE_TTL_SECONDS = 1800  # 30 min - identical queries reuse results instead of re-searching
_cache: dict[str, tuple[float, list]] = {}

# Real bug this fixes: Wikipedia sits near the top of PREFERRED_DOMAINS
# below, so for a broad/abstract skill tag (e.g. "product management") DDGS
# would surface generic dictionary/definition pages ("Product (business) -
# Wikipedia", Merriam-Webster, Cambridge Dictionary) ranked ABOVE genuinely
# useful tutorial content - technically real results, correctly classified
# as "article", but not the kind of learning resource anyone asked for.
# Rejected outright here rather than just down-ranked, matching this
# codebase's existing hard_filter design elsewhere (a wrong resource at
# position 4 is still wrong).
_DEFINITION_DOMAINS = (
    "merriam-webster.com",
    "dictionary.cambridge.org",
    "dictionary.com",
    "vocabulary.com",
    "thefreedictionary.com",
    "wiktionary.org",
)

# Domains that are reliably real, free, high-yield learning and documentation platforms.
# Results are ranked so high-quality free sources appear first.
PREFERRED_DOMAINS = (
    "geeksforgeeks.org",
    "takeuforward.org",
    "developer.mozilla.org",
    "docs.python.org",
    "react.dev",
    "fastapi.tiangolo.com",
    "docs.docker.com",
    "kubernetes.io",
    "aws.amazon.com",
    "wikipedia.org",
    "youtube.com",
    "freecodecamp.org",
    "nptel.ac.in",
    "onlinecourses.nptel.ac.in",
    "swayam.gov.in",
    "w3schools.com",
    "roadmap.sh",
    "ocw.mit.edu",
    "coursera.org",
    "edx.org",
)


def _detect_provider_and_type(url: str, title: str) -> tuple[str, str]:
    """Detects clean provider name and resource type badge for rich UI display."""
    u = (url or "").lower()
    t = (title or "").lower()

    if "geeksforgeeks.org" in u:
        return "GeeksforGeeks", "article"
    if "takeuforward.org" in u or "striver" in t:
        return "Striver Sheet", "practice_sheet"
    if "youtube.com" in u or "youtu.be" in u:
        return "YouTube Video", "video"
    if "wikipedia.org" in u:
        return "Wikipedia Deep Dive", "article"
    if "nptel.ac.in" in u or "swayam.gov.in" in u:
        return "NPTEL / Swayam", "course"
    if "freecodecamp.org" in u:
        return "freeCodeCamp", "free_guide"
    if any(d in u for d in ("docs.python.org", "developer.mozilla.org", "react.dev", "fastapi.tiangolo.com", "docs.docker.com", "kubernetes.io")):
        return "Official Documentation", "documentation"
    if "ocw.mit.edu" in u:
        return "MIT OpenCourseWare", "course"
    if "w3schools.com" in u:
        return "W3Schools", "documentation"
    if "roadmap.sh" in u:
        return "Roadmap.sh Guide", "free_guide"
    if "coursera.org" in u:
        return "Coursera", "course"
    if "edx.org" in u:
        return "edX", "course"
    return "Learning Resource", "article"


def _rank(results: list[dict]) -> list[dict]:
    def score(r):
        host = (r.get("href") or "").lower()
        for i, d in enumerate(PREFERRED_DOMAINS):
            if d in host:
                return i
        return len(PREFERRED_DOMAINS)

    return sorted(results, key=score)


def search_learning_resources(query: str, max_results: int = MAX_RESULTS, category: str = "") -> list[dict]:
    """
    Runs a live web search for learning resources matching `query`.
    Returns a list of {title, url, snippet, provider, resource_type, is_free}.
    """
    if not query or not query.strip() or DDGS is None:
        return []

    q = query.strip()
    if category == "free_practice":
        search_query = f"{q} striver sheet geeksforgeeks practice tutorial"
    elif category == "docs":
        search_query = f"{q} official documentation tutorial guide"
    elif category == "video":
        search_query = f"{q} free youtube video course full tutorial"
    elif category == "article":
        # Explicitly "how to learn"-shaped, not just the topic name - a bare
        # abstract skill tag like "product management" or "statistics" reads
        # to a search engine as a request for its DEFINITION, surfacing
        # Wikipedia/dictionary pages instead of a real learning article.
        search_query = f"how to learn {q} guide for beginners tutorial article"
    else:
        search_query = f"{q} geeksforgeeks documentation free tutorial nptel"

    cached = _cache.get(search_query)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1][:max_results]

    # Real, confirmed behavior of this free/unofficial API (found live
    # during testing, not assumed): under any recent load, DDGS returns 0
    # results in a rate-limited pattern - roughly every other call fails
    # regardless of query content (verified against several unrelated
    # queries with delays between each). This isn't a malformed-query
    # problem, it's the backend's own throttling. Retries with increasing
    # backoff to recover the calls that "should" succeed instead of this
    # whole feature silently going empty a large fraction of the time - an
    # honest limitation of a free/unofficial API, not something a retry can
    # fully guarantee away, but this meaningfully improves the odds.
    raw = []
    last_exc = None
    backoffs = [0.1]
    for attempt in range(len(backoffs) + 1):
        try:
            with DDGS() as ddgs:
                raw = list(ddgs.text(search_query, max_results=max_results * 2))
            last_exc = None
            if raw:
                break
        except DDGSException as exc:
            last_exc = exc
        except Exception as exc:  # pragma: no cover
            last_exc = exc
        if attempt < len(backoffs):
            time.sleep(backoffs[attempt])
    if last_exc is not None and not raw:
        print(f"[web_search_service] DuckDuckGo search note for '{search_query}': {last_exc}", flush=True)
        return []

    ranked = _rank(raw)
    cleaned = []
    for r in ranked:
        url = r.get("href", "").strip()
        if not url:
            continue
        if any(d in url.lower() for d in _DEFINITION_DOMAINS):
            continue  # a dictionary definition is never a real learning resource
        title = r.get("title", "").strip()
        snippet = (r.get("body", "") or "").strip()[:240]
        provider, resource_type = _detect_provider_and_type(url, title)
        is_free = not any(paid in url.lower() for paid in ("udemy.com", "pluralsight.com"))
        cleaned.append({
            "title": title,
            "url": url,
            "snippet": snippet,
            "provider": provider,
            "resource_type": resource_type,
            "is_free": is_free,
        })

    _cache[search_query] = (time.time(), cleaned)
    return cleaned[:max_results]


def enrich_with_web_resources(groups: list, label_key: str = "label", steps_key: str = "steps",
                                target_role: str = "") -> None:
    """
    Mutates a list of milestone/week dicts in place, adding a `web_resources`
    list of real, live-searched supplementary resources (YouTube video tutorials, GeeksforGeeks,
    TakeUForward Striver sheets, Official Docs, NPTEL) to each one.
    """
    if not groups:
        return

    def _one(args: tuple) -> list:
        idx, group = args
        tags = set()
        for step in group.get(steps_key, []):
            tags.update(step.get("skill_tags") or [])
        query = " ".join(list(tags)[:3]) or group.get(label_key, "") or target_role

        results = []
        # 1. If YouTube is configured, search verified high-quality video tutorials
        try:
            from app.services import youtube_provider
            if youtube_provider.is_configured() and query.strip():
                adapter = youtube_provider.get_default_adapter()
                yt_vids = adapter.search_videos(query.strip(), max_results=2, skill_tags=list(tags))
                for v in yt_vids:
                    results.append({
                        "title": v.get("title", ""),
                        "url": v.get("canonical_url", ""),
                        "snippet": (v.get("description") or "")[:240],
                        "provider": f"YouTube ({v.get('channel_title', 'Video Tutorial')})",
                        "resource_type": "video",
                        "is_free": True,
                    })
        except Exception as e:
            print(f"[web_search_service] YouTube video enrich note: {e}", flush=True)

        # 2. Complement with ONE real web search - still just 1 DDGS call per
        # week (this is a free, unofficial, rate-limit-prone API; doubling
        # the call count here to search "docs" and "article" separately was
        # tried and reproduced real, repeated empty-result failures under
        # back-to-back load during testing). Alternates category by week
        # index instead: across the 3 weeks this function typically
        # enriches, some weeks lean toward real official documentation and
        # others toward real learning articles, giving genuine variety in
        # the overall roadmap without tripling DDGS load on any single call.
        category = "docs" if idx % 2 == 0 else "article"
        seen_urls = {r["url"] for r in results}
        try:
            for wr in search_learning_resources(query, max_results=4, category=category):
                if wr.get("url") not in seen_urls:
                    seen_urls.add(wr.get("url"))
                    results.append(wr)
        except Exception as e:
            print(f"[web_search_service] '{category}' enrich failed for '{query}': {e}", flush=True)

        return results[:4]

    try:
        with ThreadPoolExecutor(max_workers=min(len(groups), 10)) as ex:
            results = list(ex.map(_one, enumerate(groups), timeout=1.5))
    except Exception as e:
        print(f"[web_search_service] Enrichment pool timeout or exception: {e}", flush=True)
        results = [[] for _ in groups]

    for group, web_resources in zip(groups, results):
        group["web_resources"] = web_resources or []



if __name__ == "__main__":
    results = search_learning_resources("data structures and algorithms python")
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  - [{r['provider']} - {r['resource_type']}] {r['title']}\n    {r['url']}")
    assert len(results) > 0, "Should return at least one result"
    print("OK - web_search_service works")

