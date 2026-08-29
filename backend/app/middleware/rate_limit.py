"""Per-user rate limiting for the LLM-backed endpoints, backed by Postgres.

Every route that ends up calling app.llm_client.chat_completion() (path
generation, step swap/rerecommend, coach practice/projects, the assistant,
profile/resume extraction) costs real Groq/Bedrock spend per call. This
closes that gap.

Real infra constraint, stated honestly: this deployment has no Redis/shared-
cache instance provisioned (single EC2 container; no infra-provisioning
access in this engagement to stand one up). The rate_limit_hits table
(migration 009_durable_infra.sql) is the real substitute: it satisfies the
actual requirement - state survives a container restart, and this would
work correctly if the app were ever scaled to multiple instances, unlike
the in-memory per-process dict this replaces - just with higher per-check
latency than a real in-memory cache would have. If Redis is provisioned
later, _check() below is the only function that needs to change; the
rate_limit() dependency factory's interface stays the same either way.

Fails OPEN on a Postgres error (logs it, lets the request through): rate
limiting is a cost-protection mechanism, not a security gate - a transient
DB hiccup should degrade to "briefly unmetered" rather than take down every
LLM-backed route in the app.
"""

import random
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException

from app.config import supabase_client
from app.middleware.auth import verify_jwt

# Roughly 1-in-N checks also sweeps rows older than the longest realistic
# window across the whole table - there's no cron/scheduled-job
# infrastructure in this deployment, so opportunistic cleanup piggybacked on
# real traffic is the honest alternative to a job that doesn't exist yet.
_CLEANUP_PROBABILITY = 0.01
_CLEANUP_MAX_AGE = timedelta(hours=1)


def _opportunistic_cleanup() -> None:
    if random.random() >= _CLEANUP_PROBABILITY:
        return
    try:
        cutoff = (datetime.now(timezone.utc) - _CLEANUP_MAX_AGE).isoformat()
        supabase_client.table("rate_limit_hits").delete().lt("created_at", cutoff).execute()
    except Exception as e:
        print(f"[rate_limit] opportunistic cleanup failed: {type(e).__name__}: {e}", flush=True)


def _check(key: str, max_calls: int, window_seconds: int) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=window_seconds)

    try:
        existing = (
            supabase_client.table("rate_limit_hits")
            .select("created_at")
            .eq("bucket_key", key)
            .gte("created_at", cutoff.isoformat())
            .order("created_at")
            .execute()
        )
        hits = existing.data or []
    except Exception as e:
        print(f"[rate_limit] check failed open for {key!r}: {type(e).__name__}: {e}", flush=True)
        return

    if len(hits) >= max_calls:
        oldest = datetime.fromisoformat(hits[0]["created_at"].replace("Z", "+00:00"))
        retry_after = max(1, int((oldest + timedelta(seconds=window_seconds) - now).total_seconds()) + 1)
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests - please wait {retry_after}s and try again.",
            headers={"Retry-After": str(retry_after)},
        )

    try:
        supabase_client.table("rate_limit_hits").insert({"bucket_key": key}).execute()
    except Exception as e:
        # Don't block the request over a failure to record it - worst case a
        # burst right after a DB hiccup goes uncounted once.
        print(f"[rate_limit] failed to record hit for {key!r}: {type(e).__name__}: {e}", flush=True)

    _opportunistic_cleanup()


def rate_limit(name: str, max_calls: int, window_seconds: int = 300):
    """FastAPI dependency factory - per-user sliding-window rate limit.

    Usage: `user_id: str = Depends(rate_limit("paths.generate", max_calls=5))`
    instead of `Depends(verify_jwt)` directly. Still resolves and returns the
    real user_id (verify_jwt is depended on, and FastAPI caches it per-request,
    so this doesn't add a second JWT verification), it just also enforces the
    budget first. `name` scopes the budget per endpoint so one user hammering
    /coach/practice doesn't burn their /paths/generate allowance too.
    """
    def _dep(user_id: str = Depends(verify_jwt)) -> str:
        _check(f"{name}:{user_id}", max_calls, window_seconds)
        return user_id

    return _dep
