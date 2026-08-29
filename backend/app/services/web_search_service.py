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
    from duckduckgo_search import DDGS
except Exception:
    DDGS = None

try:
    from duckduckgo_search.exceptions import DuckDuckGoSearchException as DDGSException
except Exception:
    try:
        from duckduckgo_search.exceptions import RatelimitException as DDGSException
    except Exception:
        DDGSException = Exception


MAX_RESULTS = 8
CACHE_TTL_SECONDS = 1800  # 30 min - identical queries reuse results instead of re-searching
_cache: dict[str, tuple[float, list]] = {}

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
    else:
        search_query = f"{q} geeksforgeeks documentation free tutorial nptel"

    cached = _cache.get(search_query)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1][:max_results]

    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(search_query, max_results=max_results * 2))
    except DDGSException as exc:
        print(f"[web_search_service] DuckDuckGo search failed: {exc}", flush=True)
        return []
    except Exception as exc:  # pragma: no cover
        print(f"[web_search_service] unexpected search error: {exc}", flush=True)
        return []

    ranked = _rank(raw)
    cleaned = []
    for r in ranked:
        url = r.get("href", "").strip()
        if not url:
            continue
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
    list of real, live-searched supplementary resources (GeeksforGeeks, TakeUForward Striver sheets,
    Official Docs, YouTube, NPTEL) to each one.
    """
    if not groups:
        return

    def _one(group: dict) -> list:
        tags = set()
        for step in group.get(steps_key, []):
            tags.update(step.get("skill_tags") or [])
        query = " ".join(list(tags)[:3]) or group.get(label_key, "") or target_role
        try:
            return search_learning_resources(query, max_results=4)
        except Exception as e:
            print(f"[web_search_service] enrich failed for '{query}': {e}", flush=True)
            return []

    with ThreadPoolExecutor(max_workers=min(len(groups), 10)) as ex:
        results = list(ex.map(_one, groups))

    for group, web_resources in zip(groups, results):
        group["web_resources"] = web_resources


if __name__ == "__main__":
    results = search_learning_resources("data structures and algorithms python")
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  - [{r['provider']} - {r['resource_type']}] {r['title']}\n    {r['url']}")
    assert len(results) > 0, "Should return at least one result"
    print("OK - web_search_service works")

