"""Feedback handling and real-time, single-step adaptive replacement.

Semantics (handle_feedback, POST /api/steps/{step_id}/feedback):
  - completed        -> mark step completed; real (weak) positive mastery
                        evidence for the course's skill_tags
                        (mastery_service.update_mastery_from_completion); no
                        path change.
  - too_easy         -> real signal the recommender UNDERESTIMATED this
                        skill: mastery nudged up BEFORE swapping, then
                        path_service.swap_step(level_hint=+1) replaces just
                        this one step with a harder alternative.
  - too_hard         -> symmetric opposite: mastery nudged down, a real
                        skill_prerequisites gap is looked up
                        (mastery_service.find_unmet_prerequisites) for an
                        honest reason_for_change, then
                        path_service.swap_step(level_hint=-1) replaces this
                        one step with an easier alternative.
  - not_interested   -> path_service.swap_step(level_hint=0): a same-level
                        alternative, no mastery change (disliking a course
                        says nothing about competency).

Every swap is a single in-place replacement (path_service.swap_step), never
a full tail rebuild - see `rebuild_tail_full` below for the old escape-hatch
behavior, kept only for the explicit "start over" endpoint, not the normal
feedback flow.

Real-time, not week-gated: apply_recent_feedback() reconsiders the
not-started tail of the path immediately whenever a task is completed with
a real note/rating/tag - it does not wait for an entire week to finish (see
its docstring for the platform-audit finding this replaced).
"""

import json
from pathlib import Path as _Path

from app.config import supabase_client
from app.llm_client import chat_completion
from app.ml.registry import get_recommender


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


# NOTE: this module used to mutate profiles.current_level/interests directly
# (_bump_level/_drop_interests/_persist_profile_change) before the
# swap_step-based single-course-replacement redesign. Removed as dead code
# (zero call sites) rather than left in place, since their presence
# incorrectly implied too_easy/not_interested still touch the global
# profile - they don't; too_easy/too_hard move per-skill mastery evidence
# (mastery_service), and not_interested currently changes neither mastery
# nor any stored preference (the "reduce format/provider preference" half
# of the platform audit's not_interested spec needs a learning-pattern/
# preference-signal system that doesn't exist yet - see the remediation
# report for this as an open item, not silently working via this removed
# code).


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
    if event_type not in ("completed", "too_easy", "too_hard", "not_interested", "resource_unavailable"):
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

    course = step.get("courses") or {}
    from app.services import mastery_service  # local import: avoid a module-load cycle

    if event_type == "completed":
        _set_step_status(step_id, "completed")
        # Track completions on the profile so the recommender can filter them
        # out of future paths and swaps. (Schema had the column since day 1,
        # nothing had been writing to it.)
        course_id = course.get("id")
        if course_id:
            _append_completed_course(user_id, course_id)
        # Real (weak) positive mastery evidence - see mastery_service for why
        # this only ever raises a floor, never claims expert-level mastery
        # from one completion.
        try:
            mastery_service.update_mastery_from_completion(user_id, course.get("skill_tags") or [])
        except Exception as e:
            print(f"[feedback_service] mastery update from completion failed: {type(e).__name__}: {e}", flush=True)
        return {"feedback_id": feedback_id, "path_updated": False, "updated_steps": []}

    # resource_unavailable: a learner-reported dead/broken resource_url.
    # Never touches mastery (a link being dead says nothing about the
    # learner's competency). Re-checks the URL LIVE before doing anything -
    # a single report (mistaken, or a transient network blip) must not
    # alone mark a real, working resource unavailable for every other
    # learner who might get recommended it. Only a confirmed-dead resource
    # gets marked unavailable (excluded from all future recommendations via
    # ranking_engine.hard_filter) and swapped for a verified alternative.
    if event_type == "resource_unavailable":
        course_id = course.get("id")
        confirmed_dead = False
        if course_id:
            from app.services import catalog_service
            try:
                confirmed_dead = not catalog_service.revalidate_course(course_id)
            except Exception as e:
                print(f"[feedback_service] resource revalidation failed: {type(e).__name__}: {e}", flush=True)
        if not confirmed_dead:
            return {
                "feedback_id": feedback_id,
                "path_updated": False,
                "updated_steps": [],
                "reason_for_change": "We re-checked this resource and it's still reachable - thanks for flagging it, though.",
            }
        from app.services import path_service as _path_service
        swap_result = _path_service.swap_step(step_id, user_id, level_hint=0)
        return {
            "feedback_id": feedback_id,
            "path_updated": bool(swap_result.get("swapped")),
            "updated_steps": [swap_result["new_step"]] if swap_result.get("new_step") else [],
            "swap_result": swap_result,
            "reason_for_change": (
                "Confirmed this resource is no longer available and swapped in a verified alternative."
                if swap_result.get("swapped")
                else "Confirmed this resource is no longer available, but no verified alternative was found."
            ),
            "path_version": swap_result.get("path_version"),
            "last_recomputed_at": swap_result.get("last_recomputed_at"),
        }

    # too_easy: real signal the recommender UNDERESTIMATED this skill -
    # update mastery BEFORE swapping, so the replacement course (and every
    # future recommendation) reflects it, not just this one substitution.
    if event_type == "too_easy":
        try:
            mastery_service.update_mastery_from_feedback(user_id, course.get("skill_tags") or [], "too_easy")
        except Exception as e:
            print(f"[feedback_service] mastery update from feedback failed: {type(e).__name__}: {e}", flush=True)

    # too_hard: symmetric opposite - real signal the recommender OVERESTIMATED
    # this skill. Lower mastery BEFORE swapping (same ordering reason as
    # too_easy above), and check for a real, named prerequisite gap so the
    # learner gets an honest, specific reason rather than just a quieter
    # course of the same topic.
    unmet_prerequisites: list = []
    if event_type == "too_hard":
        try:
            mastery_service.update_mastery_from_feedback(user_id, course.get("skill_tags") or [], "too_hard")
        except Exception as e:
            print(f"[feedback_service] mastery update from feedback failed: {type(e).__name__}: {e}", flush=True)
        try:
            unmet_prerequisites = mastery_service.find_unmet_prerequisites(user_id, course.get("skill_tags") or [])
        except Exception as e:
            print(f"[feedback_service] prerequisite-gap check failed: {type(e).__name__}: {e}", flush=True)

    # too_easy / too_hard / not_interested: delegate to path_service.swap_step
    # so we do a single-course in-place replacement instead of nuking the
    # whole tail. Local imports to avoid circular imports at module load.
    from app.services import path_service

    level_hint = {"too_easy": 1, "too_hard": -1}.get(event_type, 0)
    swap_result = path_service.swap_step(step_id, user_id, level_hint=level_hint)

    reason_for_change = None
    if event_type == "too_hard" and swap_result.get("swapped"):
        if unmet_prerequisites:
            names = ", ".join(g["name"] for g in unmet_prerequisites)
            reason_for_change = (
                f"This looked too hard, likely because of a gap in {names} - "
                "swapped in an easier alternative and lowered our confidence "
                "in your mastery of this skill."
            )
        else:
            reason_for_change = "Swapped in an easier alternative and lowered our confidence in your mastery of this skill."
    elif event_type == "too_easy" and swap_result.get("swapped"):
        reason_for_change = "Swapped in a more advanced alternative and raised our confidence in your mastery of this skill."
    elif event_type == "not_interested" and swap_result.get("swapped"):
        reason_for_change = "Swapped in an alternative that better matches your stated interests."

    return {
        "feedback_id": feedback_id,
        "path_updated": bool(swap_result.get("swapped")),
        "updated_steps": [swap_result["new_step"]] if swap_result.get("new_step") else [],
        "swap_result": swap_result,
        "reason_for_change": reason_for_change,
        "unmet_prerequisites": unmet_prerequisites,
        "path_version": swap_result.get("path_version"),
        "last_recomputed_at": swap_result.get("last_recomputed_at"),
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


def apply_recent_feedback(path_id: str, user_id: str, note: str) -> bool:
    """Called immediately after ANY task completion that carries a real note/
    rating/tag (see roadmap_service.set_task_completion) - NOT gated on
    finishing a whole week. The platform-audit finding this replaces: a
    learner's feedback on the first task of a five-task week previously sat
    unused until the other four were also done, because the old
    apply_week_feedback() only fired once every step in the CURRENT week
    was terminal. Real-time now means real-time: this fires on the
    completion event itself.

    Uses this specific feedback to reconsider the entire NOT-STARTED tail of
    the path (the only steps that can still change), replacing a course only
    when the feedback clearly suggests it's a poor fit - never touching
    anything already completed or in progress. Returns True if at least one
    real replacement was applied (so the caller can decide whether to bump
    path_version), False otherwise.

    Best-effort by design: any failure here is logged and swallowed so it can
    never break the actual task-completion request that triggered it - this
    is a real feature, but it must never be able to turn "mark task done"
    into a 500.
    """
    try:
        note = (note or "").strip()
        if not note:
            return False  # no real feedback was left - nothing to act on

        upcoming_rows = (
            supabase_client.table("path_steps")
            .select("id, course_id, courses(id, title, description, difficulty, skill_tags)")
            .eq("path_id", path_id).eq("status", "not_started")
            .order("sequence_order")
            .execute()
        ).data or []
        if not upcoming_rows:
            return False  # nothing left in this path to adjust

        prof_r = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
        if not prof_r.data:
            return False
        profile = prof_r.data[0]

        in_path = {
            r["course_id"] for r in (
                supabase_client.table("path_steps").select("course_id").eq("path_id", path_id).execute().data or []
            ) if r.get("course_id")
        }
        candidates = [c for c in (get_recommender().recommend(profile) or []) if c.get("id") not in in_path]
        if not candidates:
            return False

        current_courses = [
            {"id": r["course_id"], "title": (r.get("courses") or {}).get("title", "")}
            for r in upcoming_rows
        ]
        candidate_courses = [
            {"id": c["id"], "title": c.get("title", ""), "description": c.get("description", ""),
             "difficulty": c.get("difficulty", ""), "skill_tags": c.get("skill_tags", [])}
            for c in candidates[:20]
        ]
        user_msg = (
            f'Learner feedback just left on a task they completed: "{note}"\n\n'
            f"Upcoming not-started courses in this path:\n{json.dumps(current_courses)}\n\n"
            f"Real alternative courses:\n{json.dumps(candidate_courses)}\n\n"
            "Decide replacements now."
        )
        raw = _call_groq(
            [
                {"role": "system", "content": _load_prompt("week_feedback.txt")},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=800,
        )
        try:
            replacements = json.loads(_strip_fences(raw)).get("replacements", [])
        except Exception:
            return False

        current_ids = {c["id"] for c in current_courses}
        candidate_lookup = {c["id"]: c for c in candidate_courses}
        courses_full = {c["id"]: c for c in candidates}
        row_by_course = {r["course_id"]: r for r in upcoming_rows}

        applied = False
        for rep in replacements:
            old_id = rep.get("replace_course_id")
            new_id = rep.get("with_course_id")
            if old_id not in current_ids or new_id not in candidate_lookup:
                continue  # ignore anything not from the real lists given to the LLM
            if new_id in in_path:
                continue  # defensive: never reuse a course already elsewhere in this path
            row = row_by_course.get(old_id)
            if not row:
                continue
            new_course = courses_full.get(new_id, {})
            explanation = _generate_explanation(profile, new_course)
            supabase_client.table("path_steps").update({
                "course_id": new_id,
                "explanation": explanation,
            }).eq("id", row["id"]).execute()
            in_path.add(new_id)  # don't let a second replacement reuse it too
            applied = True
        return applied
    except Exception as e:
        print(f"[apply_recent_feedback] failed: {type(e).__name__}: {e}", flush=True)
        return False


