"""Idempotency keys for mutation routes that trigger a real, costly,
side-effecting action (an LLM + live web search call that can insert a new
row into the shared `courses` catalog) - "duplicate course insertion has
race/duplicate risks" from the audit.

Usage pattern (see routers/roadmap.py's /rerecommend and routers/feedback.py's
/swap): a route accepts an optional `Idempotency-Key` header. If present,
call check_and_reserve() first - a cached result short-circuits the real
work; a fresh key reserves a placeholder row (the table's PRIMARY KEY on
idempotency_key is the actual concurrency guard against two near-simultaneous
duplicate clicks, not application-level locking) and the route proceeds
normally, then calls store_result() with the real outcome before returning.
No key supplied -> both functions are no-ops, so idempotency is opt-in, not
a breaking change to existing callers.

Database-reliability audit additions (migration 016_integrity_hardening.sql):
  - request_hash: a key reused for a genuinely DIFFERENT request body would
    previously replay the FIRST response regardless - now detected and
    rejected (409), never silently misapplied.
  - expires_at: rows now have a real TTL (7 days) instead of accumulating
    forever - see scripts/db_maintenance.py's stale_idempotency_keys check
    for cleanup.
  - Ownership check: check_and_reserve() now refuses to replay a cached
    response for a DIFFERENT user_id than the one who originally reserved
    the key, rather than trusting the key alone - defense in depth against
    a key collision or guessed key ever being usable to read another
    learner's cached response.
"""

import hashlib
import json

from app.config import supabase_client

_PROCESSING = {"status": 425, "body": {"detail": "A request with this idempotency key is already being processed."}}
_KEY_REUSED_WITH_DIFFERENT_PAYLOAD = {
    "status": 409,
    "body": {"detail": "This Idempotency-Key was already used for a different request."},
}
_OWNERSHIP_MISMATCH = {"status": 404, "body": {"detail": "Not found."}}


def _hash_request(payload) -> str:
    """A stable hash of whatever the caller considers "the request" - a
    dict of the meaningful input fields, not the raw HTTP body (headers/
    auth token must never factor in). None/omitted payload hashes to a
    constant so callers that don't pass one (nothing to compare against)
    never spuriously collide."""
    if payload is None:
        return ""
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()


def check_and_reserve(idempotency_key: str | None, user_id: str, route: str, request_payload=None) -> dict | None:
    """Returns a cached {"status", "body"} to replay if this exact key was
    already used (whether it finished or is still in flight), or None if the
    caller should proceed with the real work (having reserved the key).

    `request_payload` (optional, backward-compatible - omitting it just
    skips the mismatch check, same as before this audit) should be a
    JSON-serializable summary of the meaningful request inputs; reusing the
    same key with a different payload returns 409 instead of replaying the
    first response."""
    if not idempotency_key:
        return None

    request_hash = _hash_request(request_payload)

    existing = (
        supabase_client.table("idempotency_keys").select("*")
        .eq("idempotency_key", idempotency_key).execute()
    )
    if existing.data:
        row = existing.data[0]
        if row.get("user_id") != user_id:
            return dict(_OWNERSHIP_MISMATCH)
        if request_hash and row.get("request_hash") and row["request_hash"] != request_hash:
            return dict(_KEY_REUSED_WITH_DIFFERENT_PAYLOAD)
        if row.get("response_status") is not None:
            return {"status": row["response_status"], "body": row["response_body"]}
        return dict(_PROCESSING)

    try:
        supabase_client.table("idempotency_keys").insert({
            "idempotency_key": idempotency_key, "user_id": user_id, "route": route,
            "request_hash": request_hash or None,
        }).execute()
    except Exception:
        # Most likely a unique-violation race: a concurrent duplicate click
        # reserved this exact key a moment ago. Re-check rather than
        # proceeding to double-execute the real (costly, side-effecting) work.
        again = (
            supabase_client.table("idempotency_keys").select("*")
            .eq("idempotency_key", idempotency_key).execute()
        )
        if again.data:
            row = again.data[0]
            if row.get("user_id") != user_id:
                return dict(_OWNERSHIP_MISMATCH)
            if request_hash and row.get("request_hash") and row["request_hash"] != request_hash:
                return dict(_KEY_REUSED_WITH_DIFFERENT_PAYLOAD)
            if row.get("response_status") is not None:
                return {"status": row["response_status"], "body": row["response_body"]}
        return dict(_PROCESSING)

    return None  # reserved - caller should do the real work now


def store_result(idempotency_key: str | None, status: int, body) -> None:
    if not idempotency_key:
        return
    try:
        supabase_client.table("idempotency_keys").update({
            "response_status": status, "response_body": body,
        }).eq("idempotency_key", idempotency_key).execute()
    except Exception as e:
        print(f"[idempotency_service] failed to store result for {idempotency_key!r}: {type(e).__name__}: {e}", flush=True)
