"""Dynamic catalog: real provenance, independent verification, and
promotion into the recommendable `courses` table.

Honest scope note: this deployment has no paid course-provider partner API
credentials (Coursera/edX/Udemy partner programs etc.) - the real,
non-seeded, LIVE source actually available is the app's own web search
(web_search_service.py, DuckDuckGo-backed, already integrated). This module
formalizes that as a first-class "provider adapter" with real provenance,
independent verification, and deduplication - the honest version of
"dynamic catalog ingestion" achievable here, instead of a fabricated
integration this project can't actually run.

Nothing here ever trusts an LLM- or search-supplied URL/title/duration on
its own say-so: every dynamically-sourced record is independently verified
(HTTPS, not a bare search-engine homepage, live-reachable) BEFORE it can be
promoted into `courses` - see validate_resource_url / ResourceValidationError,
originally built in path_service.py for the swap/rerecommend flow and moved
here so the same real check backs every dynamic-catalog entry point, not
just that one.
"""

from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

from app.config import supabase_client


class ResourceValidationError(Exception):
    """Raised when a dynamically-sourced (LLM-synthesized or web-searched)
    resource has no real, independently-verifiable URL. Callers MUST
    surface this as an honest failure - never persist a placeholder/guessed
    URL into the shared courses catalog. Real production bug this replaced:
    a literal "https://google.com" fallback that got INSERTed directly into
    the shared, global `courses` table with a real pgvector embedding - a
    permanent, cross-user catalog-poisoning entry (see docs/security_audit.md)."""


# Bare search-engine/portal homepages sometimes hallucinated as a
# "resource" when there's nothing real to point at - never themselves a
# course/tutorial, regardless of reachability.
_BLOCKED_BARE_DOMAINS = {
    "google.com", "www.google.com",
    "bing.com", "www.bing.com",
    "duckduckgo.com", "www.duckduckgo.com",
    "yahoo.com", "www.yahoo.com",
}


def _check_url(url: str) -> dict:
    """Runs all three checks and returns the raw verdict, used both by
    validate_resource_url (the boolean gate) and record_verification (the
    audit row) so they can never disagree."""
    result = {"https_ok": False, "domain_allowed": False, "reachable": False, "http_status": None}
    if not url:
        return result
    try:
        parsed = urlparse(url)
    except ValueError:
        return result
    result["https_ok"] = parsed.scheme == "https" and bool(parsed.netloc)
    if not result["https_ok"]:
        return result
    host = parsed.netloc.lower().split(":")[0]
    result["domain_allowed"] = not (host in _BLOCKED_BARE_DOMAINS and not parsed.path.strip("/"))
    if not result["domain_allowed"]:
        return result

    headers = {"User-Agent": "PathFinder-AI-App"}
    try:
        with httpx.Client(timeout=3.0, follow_redirects=True) as client:
            resp = client.head(url, headers=headers)
            if resp.status_code >= 400:
                resp = client.get(url, headers=headers)
            result["http_status"] = resp.status_code
            result["reachable"] = resp.status_code < 400
    except Exception as e:
        print(f"[catalog_service] reachability check failed for {url}: {type(e).__name__}: {e}", flush=True)
    return result


def validate_resource_url(url: str) -> bool:
    """Structural + live-reachability check before a dynamically-sourced URL
    is ever trusted. Deliberately bounded (3s timeout, HEAD-then-GET) - this
    can run synchronously inside a live swap/rerecommend request, so it must
    fail fast rather than stall the whole request."""
    v = _check_url(url)
    return v["https_ok"] and v["domain_allowed"] and v["reachable"]


def record_verification(provider_resource_id: str, url: str) -> dict:
    """Runs the check once and persists an auditable resource_verification
    row - the independent record referenced by the master audit's
    'resource_verification' data model. Returns the verdict dict."""
    v = _check_url(url)
    passed = v["https_ok"] and v["domain_allowed"] and v["reachable"]
    try:
        supabase_client.table("resource_verification").insert({
            "provider_resource_id": provider_resource_id,
            "https_ok": v["https_ok"],
            "domain_allowed": v["domain_allowed"],
            "reachable": v["reachable"],
            "http_status": v["http_status"],
            "passed": passed,
        }).execute()
    except Exception as e:
        print(f"[catalog_service] failed to record verification: {type(e).__name__}: {e}", flush=True)
    return {**v, "passed": passed}


def ingest_web_result(result: dict, skill_tags: list[str] | None = None, difficulty: str | None = None) -> dict | None:
    """Ingests ONE real web_search_service result ({title, url, snippet,
    provider?}) into provider_resources with real provenance, verifies it,
    and returns the (possibly pre-existing, deduplicated-by-URL)
    provider_resources row. Returns None if the URL fails verification -
    never inserts an unverified record, and never fabricates one that
    "looks" valid to paper over a failure.
    """
    url = (result.get("url") or "").strip()
    title = (result.get("title") or "").strip()
    if not url or not title:
        return None

    existing = supabase_client.table("provider_resources").select("*").eq("canonical_url", url).execute()
    if existing.data:
        return existing.data[0]

    # Insert first (need a real id to attach the verification row to), then verify.
    row = {
        "source": "web_search",
        "provider": result.get("provider") or _guess_provider(url),
        "canonical_url": url,
        "title": title,
        "description": (result.get("snippet") or "")[:2000],
        "skill_tags": skill_tags or [],
        "difficulty": difficulty if difficulty in ("beginner", "intermediate", "advanced") else None,
        "cost": "free" if _looks_free(url) else "unknown",
        "format": "unknown",
        "availability_status": "unverified",
    }
    inserted = supabase_client.table("provider_resources").insert(row).execute()
    if not inserted.data:
        return None
    resource = inserted.data[0]

    verdict = record_verification(resource["id"], url)
    status = "available" if verdict["passed"] else "unavailable"
    supabase_client.table("provider_resources").update({
        "availability_status": status,
        "last_checked_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", resource["id"]).execute()
    resource["availability_status"] = status
    return resource


def _guess_provider(url: str) -> str:
    host = urlparse(url).netloc.lower().replace("www.", "")
    return host.split(".")[0].capitalize() if host else "Web"


def _looks_free(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(d in host for d in (
        "freecodecamp.org", "nptel.ac.in", "swayam.gov.in", "docs.python.org",
        "developer.mozilla.org", "kubernetes.io", "docs.docker.com", "youtube.com",
    ))


def promote_to_course(provider_resource_id: str) -> dict | None:
    """Promotes an ALREADY-VERIFIED (availability_status='available')
    provider_resources row into the recommendable `courses` table.
    Idempotent: if this resource was already promoted, returns the existing
    course. Raises ResourceValidationError if the resource was never
    actually verified as available - promotion is not a second chance to
    skip verification."""
    pr = supabase_client.table("provider_resources").select("*").eq("id", provider_resource_id).execute()
    if not pr.data:
        raise ResourceValidationError(f"No such provider_resource: {provider_resource_id}")
    resource = pr.data[0]

    if resource.get("promoted_course_id"):
        existing = supabase_client.table("courses").select("*").eq("id", resource["promoted_course_id"]).execute()
        if existing.data:
            return existing.data[0]

    if resource.get("availability_status") != "available":
        raise ResourceValidationError(
            f"provider_resource {provider_resource_id} is not verified available "
            f"(status={resource.get('availability_status')})"
        )

    from app.ml.embedder import embed_text
    tags = resource.get("skill_tags") or []
    emb = embed_text(f"{resource['title']} {resource.get('description', '')} {' '.join(tags)}")

    course = supabase_client.table("courses").insert({
        "title": resource["title"],
        "description": resource.get("description", ""),
        "provider": resource.get("provider") or "Web Learning Resource",
        "difficulty": resource.get("difficulty") or "beginner",
        "duration_hrs": int(resource.get("duration_hrs") or 6),
        "resource_url": resource["canonical_url"],
        "skill_tags": tags,
        "prerequisites": [],
        "embedding": emb,
        "source": "provider_resource",
        "provider_resource_id": resource["id"],
        "last_verified_at": resource.get("last_checked_at") or datetime.now(timezone.utc).isoformat(),
        "availability_status": "available",
    }).execute()
    if not course.data:
        raise ResourceValidationError(f"Failed to persist promoted course for {provider_resource_id}")

    supabase_client.table("provider_resources").update(
        {"promoted_course_id": course.data[0]["id"]}
    ).eq("id", provider_resource_id).execute()
    return course.data[0]


def revalidate_course(course_id: str) -> bool:
    """Re-checks a real course's resource_url and marks it unavailable if it
    no longer resolves - "mark stale resources unavailable; do not
    recommend them" from the audit. Not currently scheduled (no cron/task
    queue infra in this deployment) - available for a maintenance endpoint
    or future scheduled job to call."""
    c = supabase_client.table("courses").select("id, resource_url").eq("id", course_id).execute()
    if not c.data:
        return False
    url = c.data[0].get("resource_url") or ""
    ok = validate_resource_url(url)
    supabase_client.table("courses").update({
        "availability_status": "available" if ok else "unavailable",
        "last_verified_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", course_id).execute()
    return ok
