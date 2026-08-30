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
"""

from app.config import supabase_client

_PROCESSING = {"status": 425, "body": {"detail": "A request with this idempotency key is already being processed."}}


def check_and_reserve(idempotency_key: str | None, user_id: str, route: str) -> dict | None:
    """Returns a cached {"status", "body"} to replay if this exact key was
    already used (whether it finished or is still in flight), or None if the
    caller should proceed with the real work (having reserved the key)."""
    if not idempotency_key:
        return None

    existing = (
        supabase_client.table("idempotency_keys").select("*")
        .eq("idempotency_key", idempotency_key).execute()
    )
    if existing.data:
        row = existing.data[0]
        if row.get("response_status") is not None:
            return {"status": row["response_status"], "body": row["response_body"]}
        return dict(_PROCESSING)

    try:
        supabase_client.table("idempotency_keys").insert({
            "idempotency_key": idempotency_key, "user_id": user_id, "route": route,
        }).execute()
    except Exception:
        # Most likely a unique-violation race: a concurrent duplicate click
        # reserved this exact key a moment ago. Re-check rather than
        # proceeding to double-execute the real (costly, side-effecting) work.
        again = (
            supabase_client.table("idempotency_keys").select("*")
            .eq("idempotency_key", idempotency_key).execute()
        )
        if again.data and again.data[0].get("response_status") is not None:
            row = again.data[0]
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
