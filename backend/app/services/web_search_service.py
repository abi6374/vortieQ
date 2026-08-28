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
    from duckduckgo_search.exceptions import DuckDuckGoSearchException as DDGSException
except ImportError:
    try:
        from ddgs import DDGS
        from ddgs.exceptions import DDGSException
    except ImportError:
        DDGS = None
        DDGSException = Exception

MAX_RESULTS = 8
CACHE_TTL_SECONDS = 1800  # 30 min - identical queries reuse results instead of re-searching
_cache: dict[str, tuple[float, list]] = {}

# Domains that are reliably real, free (or free-to-audit) course platforms.
# Results are ranked so these appear first, but off-list results aren't
# dropped — the ranking is a preference, not a filter.
PREFERRED_DOMAINS = (
    "nptel.ac.in",
    "onlinecourses.nptel.ac.in",
    "swayam.gov.in",
    "coursera.org",
    "edx.org",
    "freecodecamp.org",
    "ocw.mit.edu",
    "developer.mozilla.org",
    "docs.python.org",
    "cloud.google.com",
    "learn.microsoft.com",
    "kubernetes.io",
    "docs.docker.com",
)


def _rank(results: list[dict]) -> list[dict]:
    def score(r):
        host = (r.get("href") or "").lower()
        for i, d in enumerate(PREFERRED_DOMAINS):
            if d in host:
                return i
        return len(PREFERRED_DOMAINS)

    return sorted(results, key=score)


def search_learning_resources(query: str, max_results: int = MAX_RESULTS) -> list[dict]:
    """
    Runs a live web search for learning resources matching `query`.
    Returns a list of {title, url, snippet}, real-course domains ranked first.
    Never raises — a search failure returns an empty list so callers can
    degrade gracefully (this is a "nice to have" supplement, not core path
    generation, and the whole app must not 500 if DuckDuckGo is unreachable).
    """
    if not query or not query.strip() or DDGS is None:
        return []

    search_query = f"{query.strip()} free online course"

    cached = _cache.get(search_query)
    if cached and (time.time() - cached[0]) < CACHE_TTL_SECONDS:
        return cached[1][:max_results]

    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(search_query, max_results=max_results * 2))
    except DDGSException as exc:
        print(f"[web_search_service] DuckDuckGo search failed: {exc}", flush=True)
        return []
    except Exception as exc:  # pragma: no cover - defensive, see docstring
        print(f"[web_search_service] unexpected search error: {exc}", flush=True)
        return []

    ranked = _rank(raw)
    cleaned = [
        {
            "title": r.get("title", "").strip(),
            "url": r.get("href", "").strip(),
            "snippet": (r.get("body", "") or "").strip()[:220],
        }
        for r in ranked
        if r.get("href")
    ]
    _cache[search_query] = (time.time(), cleaned)
    return cleaned[:max_results]


def enrich_with_web_resources(groups: list, label_key: str = "label", steps_key: str = "steps",
                                target_role: str = "") -> None:
    """
    Mutates a list of milestone/week dicts in place, adding a `web_resources`
    list of real, live-searched supplementary resources (e.g. NPTEL courses)
    to each one — built from the real skill_tags of that group's steps.

    Shared by path_service (milestones) and roadmap_service (weeks) so both
    the initial path-generation response and the ongoing week-based roadmap
    view get the same live enrichment from one place.

    Deliberately NOT fed to any LLM — callers only ever sequence/pick from
    known internal course IDs, so this can never introduce a hallucinated
    link. It's purely additive, computed after the real data is assembled.
    Never raises: a search failure degrades to an empty list per group.

    Runs one search per group IN PARALLEL (network-bound, not CPU-bound) —
    doing these sequentially took ~3s/group, which made a 10-week roadmap
    take 30+ seconds to load. Parallel gets the same 10 groups back in ~5s.
    """
    if not groups:
        return

    def _one(group: dict) -> list:
        tags = set()
        for step in group.get(steps_key, []):
            tags.update(step.get("skill_tags") or [])
        query = " ".join(list(tags)[:3]) or group.get(label_key, "") or target_role
        try:
            return search_learning_resources(query, max_results=3)
        except Exception as e:
            print(f"[web_search_service] enrich failed for '{query}': {e}", flush=True)
            return []

    with ThreadPoolExecutor(max_workers=min(len(groups), 10)) as ex:
        results = list(ex.map(_one, groups))

    for group, web_resources in zip(groups, results):
        group["web_resources"] = web_resources


if __name__ == "__main__":
    results = search_learning_resources("machine learning for beginners")
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  - {r['title']}\n    {r['url']}")
    assert len(results) > 0, "Should return at least one result"
    print("OK - web_search_service works")
