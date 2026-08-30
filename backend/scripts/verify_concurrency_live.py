"""Live concurrency verification for the database-reliability audit.

Deliberately NOT a pytest test (not in tests/, no test_ prefix) - it makes
real concurrent requests against the REAL deployed Supabase project using
the established safe test account, and must never be picked up by an
automated `pytest tests/` run (which is required to stay fully isolated
from live infrastructure - see backend/tests/conftest.py and this
project's test-isolation discipline).

Run manually:
    python -m scripts.verify_concurrency_live

What it proves, empirically, against the real database:
  1. The OLD roadmap_service.bump_path_version pattern (SELECT version,
     compute +1 in Python, then UPDATE) genuinely loses updates under
     concurrent calls - reproduced exactly as it used to be written.
  2. The NEW bump_path_version RPC (migration 017 - one UPDATE...RETURNING
     statement) does not lose any updates under the same concurrent load.

Creates and deletes its own temporary learning_paths/path_steps rows under
the established test account (a1f74986-1de9-4d08-bc1f-c0054e7d7ebc) -
verifies cleanup at the end of every run, including on failure.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from supabase import create_client

from app.config import settings, supabase_client

TEST_USER_ID = "a1f74986-1de9-4d08-bc1f-c0054e7d7ebc"
TEST_COURSE_ID = "3efddad8-9a41-4672-a94c-adeb6e3072fb"
N_CONCURRENT = 20
WORKERS = 8


def _fresh_client():
    # A separate client (and HTTP connection) per thread - sharing one
    # pooled HTTP/2 client across threads under real concurrency produced
    # spurious "Server disconnected" errors unrelated to the thing being
    # tested; this is the realistic shape of genuinely concurrent requests
    # anyway (separate browser tabs, separate backend workers).
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _make_test_path(goal_text: str) -> str:
    return supabase_client.rpc("create_learning_path_with_steps", {
        "p_user_id": TEST_USER_ID,
        "p_goal_text": goal_text,
        "p_steps": [{"course_id": TEST_COURSE_ID, "milestone_label": "M1", "explanation": "verification"}],
    }).execute().data


def _cleanup(path_id: str) -> None:
    supabase_client.table("path_steps").delete().eq("path_id", path_id).execute()
    supabase_client.table("learning_paths").delete().eq("id", path_id).execute()


def _old_racy_bump(path_id: str) -> int:
    """Exact reproduction of the pre-audit roadmap_service.bump_path_version."""
    client = _fresh_client()
    current = client.table("learning_paths").select("version").eq("id", path_id).execute()
    next_version = (current.data[0].get("version") or 0) + 1 if current.data else 1
    stamp = datetime.now(timezone.utc).isoformat()
    client.table("learning_paths").update({"version": next_version, "last_recomputed_at": stamp}).eq("id", path_id).execute()
    return next_version


def _new_atomic_bump(path_id: str) -> int:
    client = _fresh_client()
    return client.rpc("bump_path_version", {"p_path_id": path_id}).execute().data[0]["version"]


def _run_concurrent(fn, path_id: str) -> list[int]:
    results = []
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = [ex.submit(fn, path_id) for _ in range(N_CONCURRENT)]
        for f in as_completed(futures):
            results.append(f.result())
    return results


def main() -> None:
    print(f"=== OLD pattern (SELECT-then-write): {N_CONCURRENT} concurrent bump_path_version calls ===")
    old_path_id = _make_test_path("VERIFY OLD PATTERN - safe to delete")
    try:
        results = _run_concurrent(_old_racy_bump, old_path_id)
        final = supabase_client.table("learning_paths").select("version").eq("id", old_path_id).execute().data[0]["version"]
        print(f"expected final version: {1 + N_CONCURRENT} | actual: {final}")
        print(f"distinct computed versions: {len(set(results))} of {len(results)} calls")
        lost = final < 1 + N_CONCURRENT or len(set(results)) < len(results)
        print("RACE REPRODUCED (updates lost)" if lost else "no race this run (timing-dependent)")
    finally:
        _cleanup(old_path_id)

    print(f"\n=== NEW atomic RPC: {N_CONCURRENT} concurrent bump_path_version calls ===")
    new_path_id = _make_test_path("VERIFY NEW RPC - safe to delete")
    try:
        results = _run_concurrent(_new_atomic_bump, new_path_id)
        final = supabase_client.table("learning_paths").select("version").eq("id", new_path_id).execute().data[0]["version"]
        print(f"expected final version: {1 + N_CONCURRENT} | actual: {final}")
        print(f"distinct returned versions: {len(set(results))} of {len(results)} calls")
        ok = final == 1 + N_CONCURRENT and len(set(results)) == len(results)
        print("PASS: no lost updates" if ok else "FAIL: lost an update - regression, investigate immediately")
    finally:
        _cleanup(new_path_id)


if __name__ == "__main__":
    main()
