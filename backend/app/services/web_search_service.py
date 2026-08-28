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

from ddgs import DDGS
from ddgs.exceptions import DDGSException

MAX_RESULTS = 8

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
    if not query or not query.strip():
        return []

    search_query = f"{query.strip()} free online course"
    try:
        with DDGS() as ddgs:
            raw = list(ddgs.text(search_query, max_results=max_results * 2))
    except DDGSException as exc:
        print(f"[web_search_service] DuckDuckGo search failed: {exc}", flush=True)
        return []
    except Exception as exc:  # pragma: no cover - defensive, see docstring
        print(f"[web_search_service] unexpected search error: {exc}", flush=True)
        return []

    ranked = _rank(raw)[:max_results]
    return [
        {
            "title": r.get("title", "").strip(),
            "url": r.get("href", "").strip(),
            "snippet": (r.get("body", "") or "").strip()[:220],
        }
        for r in ranked
        if r.get("href")
    ]


if __name__ == "__main__":
    results = search_learning_resources("machine learning for beginners")
    print(f"Got {len(results)} results:")
    for r in results:
        print(f"  - {r['title']}\n    {r['url']}")
    assert len(results) > 0, "Should return at least one result"
    print("OK - web_search_service works")
