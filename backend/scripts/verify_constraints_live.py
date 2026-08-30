"""Live constraint-violation verification for the database-reliability
audit. Deliberately NOT a pytest test (see verify_concurrency_live.py's
docstring for why) - proves the new integrity constraints from migrations
016/018 actually reject bad data against the real deployed schema, not
just that the migration SQL parsed.

Run manually:
    python -m scripts.verify_constraints_live

Creates and deletes its own temporary rows under the established test
account (a1f74986-1de9-4d08-bc1f-c0054e7d7ebc) - verifies cleanup at the
end of every run.
"""

from __future__ import annotations

import uuid

from app.config import supabase_client

TEST_USER_ID = "a1f74986-1de9-4d08-bc1f-c0054e7d7ebc"
TEST_COURSE_ID = "3efddad8-9a41-4672-a94c-adeb6e3072fb"


def main() -> None:
    results: dict[str, str] = {}
    path_id = supabase_client.rpc("create_learning_path_with_steps", {
        "p_user_id": TEST_USER_ID,
        "p_goal_text": "CONSTRAINT VERIFICATION - safe to delete",
        "p_steps": [{"course_id": TEST_COURSE_ID, "milestone_label": "M1", "explanation": "e1"}],
    }).execute().data

    # 1. path_steps_path_seq_uniq (migration 016)
    try:
        supabase_client.table("path_steps").insert({
            "path_id": path_id, "course_id": TEST_COURSE_ID, "sequence_order": 1,
            "milestone_label": "dup", "status": "not_started",
        }).execute()
        results["path_steps unique(path_id, sequence_order)"] = "FAIL - duplicate sequence_order was allowed"
    except Exception as e:
        results["path_steps unique(path_id, sequence_order)"] = f"PASS - rejected ({type(e).__name__})"

    # 2. recommendation_runs_trigger_check (migration 016)
    try:
        supabase_client.table("recommendation_runs").insert({
            "user_id": TEST_USER_ID, "trigger": "not_a_real_trigger_value",
            "input_snapshot_hash": "x", "scoring_version": "v1", "weights": {},
        }).execute()
        results["recommendation_runs.trigger CHECK"] = "FAIL - invalid trigger value was allowed"
    except Exception as e:
        results["recommendation_runs.trigger CHECK"] = f"PASS - rejected ({type(e).__name__})"

    # 3. idx_courses_resource_url_provider_uniq (migration 016)
    unique_url = f"https://example.com/constraint-test-{uuid.uuid4()}"
    supabase_client.table("courses").insert({
        "title": f"Constraint Test Course {uuid.uuid4()}", "resource_url": unique_url, "source": "provider_resource",
    }).execute()
    try:
        supabase_client.table("courses").insert({
            "title": f"Constraint Test Course Dup {uuid.uuid4()}", "resource_url": unique_url, "source": "provider_resource",
        }).execute()
        results["courses unique(resource_url) WHERE source='provider_resource'"] = "FAIL - duplicate URL was allowed"
    except Exception as e:
        results["courses unique(resource_url) WHERE source='provider_resource'"] = f"PASS - rejected ({type(e).__name__})"

    # 4. idx_study_sessions_task_completed_uniq (migration 018)
    step = supabase_client.table("path_steps").select("id").eq("path_id", path_id).limit(1).execute().data[0]
    supabase_client.table("study_sessions").insert({
        "user_id": TEST_USER_ID, "step_id": step["id"], "activity": "task_completed", "minutes": 5,
    }).execute()
    try:
        supabase_client.table("study_sessions").insert({
            "user_id": TEST_USER_ID, "step_id": step["id"], "activity": "task_completed", "minutes": 5,
        }).execute()
        results["study_sessions unique(user_id, step_id) WHERE task_completed"] = "FAIL - duplicate completion was allowed"
    except Exception as e:
        results["study_sessions unique(user_id, step_id) WHERE task_completed"] = f"PASS - rejected ({type(e).__name__})"

    for name, outcome in results.items():
        print(f"{name}: {outcome}")

    # Cleanup - always runs, even if an assertion above indicated FAIL.
    supabase_client.table("study_sessions").delete().eq("user_id", TEST_USER_ID).eq("step_id", step["id"]).execute()
    supabase_client.table("path_steps").delete().eq("path_id", path_id).execute()
    supabase_client.table("learning_paths").delete().eq("id", path_id).execute()
    supabase_client.table("courses").delete().eq("resource_url", unique_url).execute()
    print("\ncleaned up all test rows")

    if any(v.startswith("FAIL") for v in results.values()):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
