"""Feedback handling and adaptive re-sequencing of remaining path steps.

Semantics (see MASTER_README section 5.1):
  - completed        -> mark step completed; no path change.
  - too_easy         -> mark step skipped; bump profile level up one tier;
                        re-sequence the not_started tail of the path.
  - not_interested   -> mark step skipped; remove the course's skill_tags from
                        the profile's interests; re-sequence the not_started tail.

Re-sequencing means: delete all not_started rows in this path, call the
recommender with the adjusted profile, filter out courses already present in
the path (completed / in_progress / skipped), and let the LLM sequence what
remains into fresh milestones which we then insert with sequence_order
continuing from the last kept step.
"""

import json
from pathlib import Path as _Path

from app.config import supabase_client
from app.llm_client import chat_completion
from app.ml.registry import get_recommender


LEVEL_ORDER = ["beginner", "intermediate", "advanced"]


# ---------------------------------------------------------------- LLM helpers
def _load_prompt(name: str) -> str:
    return (_Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list, max_tokens: int = 6000) -> str:
    # Name kept for minimal diff at call sites below; routes through
    # app.llm_client, which picks Groq or Bedrock per settings.LLM_PROVIDER.
    return chat_completion(messages, max_tokens=max_tokens, temperature=0.2)


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


# ---------------------------------------------------------------- DB helpers
def _load_step_with_path(step_id: str, user_id: str) -> tuple[dict, dict]:
    """Fetch the step joined with its parent path and course; enforce ownership.

    Raises ValueError if the step doesn't exist or doesn't belong to the user.
    """
    r = (
        supabase_client.table("path_steps")
        .select(
            "*, learning_paths!inner(id, user_id, goal_text), "
            "courses(id, title, description, skill_tags, difficulty)"
        )
        .eq("id", step_id)
        .execute()
    )
    if not r.data:
        raise ValueError("Step not found")
    step = r.data[0]
    if (step.get("learning_paths") or {}).get("user_id") != user_id:
        raise ValueError("Step not found")
    return step, step["learning_paths"]


def _fetch_profile(user_id: str) -> dict:
    r = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if not r.data:
        raise ValueError("Profile not found")
    return r.data[0]


def _write_feedback_event(
    user_id: str, path_id: str, step_id: str, event_type: str, note: str
) -> str:
    r = supabase_client.table("feedback_events").insert({
        "user_id": user_id,
        "path_id": path_id,
        "step_id": step_id,
        "event_type": event_type,
        "note": note or "",
    }).execute()
    return r.data[0]["id"] if r.data else ""


def _set_step_status(step_id: str, status: str) -> None:
    supabase_client.table("path_steps").update({"status": status}).eq(
        "id", step_id
    ).execute()


# ---------------------------------------------------------------- Profile mutation
def _bump_level(profile: dict) -> dict:
    """Advance current_level by one tier (capped at 'advanced')."""
    cur = profile.get("current_level", "beginner")
    idx = LEVEL_ORDER.index(cur) if cur in LEVEL_ORDER else 0
    profile["current_level"] = LEVEL_ORDER[min(idx + 1, len(LEVEL_ORDER) - 1)]
    return profile


def _drop_interests(profile: dict, tags_to_remove: list) -> dict:
    """Remove any interest that matches (case-insensitively) a skill tag of the
    disliked course. Keeps interests non-empty so the recommender still works."""
    remove = {t.lower() for t in tags_to_remove if t}
    kept = [i for i in profile.get("interests") or [] if i.lower() not in remove]
    if kept:
        profile["interests"] = kept
    return profile


def _persist_profile_change(user_id: str, profile: dict) -> None:
    supabase_client.table("profiles").update({
        "current_level": profile.get("current_level"),
        "interests": profile.get("interests"),
    }).eq("id", user_id).execute()


# ---------------------------------------------------------------- Re-sequencing
def _last_sequence_order(path_id: str) -> int:
    """Highest sequence_order still present in the path (after deleting the tail)."""
    r = (
        supabase_client.table("path_steps")
        .select("sequence_order")
        .eq("path_id", path_id)
        .order("sequence_order", desc=True)
        .limit(1)
        .execute()
    )
    return r.data[0]["sequence_order"] if r.data else 0


def _delete_not_started(path_id: str) -> None:
    supabase_client.table("path_steps").delete().eq(
        "path_id", path_id
    ).eq("status", "not_started").execute()


def _existing_course_ids(path_id: str) -> set:
    r = supabase_client.table("path_steps").select("course_id").eq(
        "path_id", path_id
    ).execute()
    return {row["course_id"] for row in (r.data or []) if row.get("course_id")}


def _generate_explanation(profile: dict, course: dict) -> str:
    user_msg = (
        f"Learner goal: {profile.get('goal_text', '')}. "
        f"Target role: {profile.get('target_role', '')}. "
        f"Level: {profile.get('current_level', '')}. "
        f"Course: {course.get('title', '')} - {course.get('description', '')}"
    )
    return _call_groq(
        [
            {"role": "system", "content": _load_prompt("explain.txt")},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1200,
    )


def _regenerate_tail(path_id: str, profile: dict) -> list:
    """Rebuild the not_started tail of the path based on the adjusted profile.

    Returns the freshly inserted step rows in the shape the frontend expects.
    """
    _delete_not_started(path_id)
    already_in_path = _existing_course_ids(path_id)

    candidates = [
        c for c in get_recommender().recommend(profile)
        if c["id"] not in already_in_path
    ]
    if not candidates:
        return []

    candidates_for_llm = [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "difficulty": c["difficulty"],
            "skill_tags": c.get("skill_tags", []),
            "duration_hrs": c.get("duration_hrs", 10),
        }
        for c in candidates
    ]

    user_msg = f"""LEARNER PROFILE (adjusted after feedback):
{json.dumps(profile, indent=2, default=str)}

CANDIDATE COURSES (use ONLY these course IDs):
{json.dumps(candidates_for_llm, indent=2)}

Generate the learning path JSON now."""

    messages = [
        {"role": "system", "content": _load_prompt("path_generate.txt")},
        {"role": "user", "content": user_msg},
    ]

    raw = _call_groq(messages)
    try:
        milestones = json.loads(_strip_fences(raw))["milestones"]
    except Exception:
        messages.append({"role": "assistant", "content": raw})
        messages.append({
            "role": "user",
            "content": "Return ONLY the JSON object. No markdown fences.",
        })
        try:
            milestones = json.loads(_strip_fences(_call_groq(messages)))["milestones"]
        except Exception as e:
            # LLM couldn't produce valid JSON on either attempt. Rather than
            # 500 the user, leave the path as-is (tail already deleted, but
            # the frontend will just render fewer steps).
            print(f"[feedback regen] gave up after 2 bad JSON attempts: {e!r}", flush=True)
            return []

    course_lookup = {c["id"]: c for c in candidates}
    seq = _last_sequence_order(path_id)
    inserted = []

    # Batch every explanation into one call instead of one call per course -
    # same fix, same reason, as path_service.generate_path() (see
    # PROGRESS_TRACKER.md Round 11: N sequential calls was enough on its own
    # to trip Bedrock's throughput quota and fail the whole request).
    from app.services.path_service import generate_explanations_batch
    ordered_ids = [
        cid for milestone in milestones for cid in milestone.get("course_ids", [])
        if cid in course_lookup
    ]
    explanations = generate_explanations_batch(profile, [course_lookup[cid] for cid in ordered_ids])

    for milestone in milestones:
        for course_id in milestone.get("course_ids", []):
            course = course_lookup.get(course_id)
            if not course:  # LLM hallucinated an id - skip
                continue
            seq += 1
            explanation = explanations.get(course_id) or _generate_explanation(profile, course)
            row = supabase_client.table("path_steps").insert({
                "path_id": path_id,
                "course_id": course_id,
                "sequence_order": seq,
                "milestone_label": milestone["label"],
                "status": "not_started",
                "explanation": explanation,
            }).execute()
            new_id = row.data[0]["id"] if row.data else ""
            inserted.append({
                "step_id": new_id,
                "course_id": course_id,
                "title": course.get("title", ""),
                "provider": course.get("provider", ""),
                "duration_hrs": course.get("duration_hrs", 0),
                "difficulty": course.get("difficulty", ""),
                "skill_tags": course.get("skill_tags", []),
                "resource_url": course.get("resource_url", ""),
                "milestone_label": milestone["label"],
                "explanation": explanation,
                "status": "not_started",
            })

    return inserted


# ---------------------------------------------------------------- Public entry point
def handle_feedback(step_id: str, event_type: str, note: str, user_id: str) -> dict:
    if event_type not in ("completed", "too_easy", "not_interested"):
        raise ValueError(f"Unknown event_type: {event_type}")

    step, path = _load_step_with_path(step_id, user_id)
    path_id = path["id"]

    # Idempotency guard: refuse to re-process a step whose feedback has already
    # landed. Prevents cascade re-runs from React StrictMode double-invoke,
    # rapid double-clicks, or stale button state in the dashboard.
    current_status = step.get("status")
    if current_status in ("completed", "skipped"):
        return {
            "feedback_id": None,
            "path_updated": False,
            "updated_steps": [],
            "note": f"Step is already {current_status}; feedback ignored.",
        }

    feedback_id = _write_feedback_event(user_id, path_id, step_id, event_type, note)

    if event_type == "completed":
        _set_step_status(step_id, "completed")
        # Track completions on the profile so the recommender can filter them
        # out of future paths and swaps. (Schema had the column since day 1,
        # nothing had been writing to it.)
        course_id = (step.get("courses") or {}).get("id")
        if course_id:
            _append_completed_course(user_id, course_id)
        return {"feedback_id": feedback_id, "path_updated": False, "updated_steps": []}

    # too_easy / not_interested: delegate to path_service.swap_step so we do a
    # single-course in-place replacement instead of nuking the whole tail.
    # Local imports to avoid circular imports at module load.
    from app.services import path_service

    level_hint = 1 if event_type == "too_easy" else 0
    swap_result = path_service.swap_step(step_id, user_id, level_hint=level_hint)
    return {
        "feedback_id": feedback_id,
        "path_updated": bool(swap_result.get("swapped")),
        "updated_steps": [swap_result["new_step"]] if swap_result.get("new_step") else [],
        "swap_result": swap_result,
    }


# Kept for the explicit "rebuild remaining path" escape-hatch endpoint. Not
# called from the normal feedback flow anymore.
def rebuild_tail_full(step_id_or_none: str | None, user_id: str, path_id: str) -> dict:
    """Old behavior: adjust profile, delete not_started tail, regen from scratch."""
    profile = _fetch_profile(user_id)
    updated_steps = _regenerate_tail(path_id, profile)
    return {"path_updated": True, "updated_steps": updated_steps}


def _append_completed_course(user_id: str, course_id: str) -> None:
    existing = supabase_client.table("profiles").select("completed_courses").eq("id", user_id).execute()
    ids = list((existing.data[0].get("completed_courses") if existing.data else None) or [])
    if course_id not in ids:
        ids.append(course_id)
        supabase_client.table("profiles").update({"completed_courses": ids}).eq("id", user_id).execute()


