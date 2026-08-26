import json
from pathlib import Path

from app.config import groq_client, settings, supabase_client
from app.ml.registry import get_recommender


def _load_prompt(name: str) -> str:
    return (Path(__file__).parent.parent / "prompts" / name).read_text(encoding="utf-8")


def _call_groq(messages: list, max_tokens: int = 6000) -> str:
    # NOTE: the gpt-oss models are reasoning models — their chain-of-thought is
    # billed against max_tokens before any answer is emitted. Keep the budget
    # generous and reasoning_effort low, or `content` comes back empty.
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.2,
        reasoning_effort="low",
    )
    return (response.choices[0].message.content or "").strip()


def _strip_fences(raw: str) -> str:
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return raw.strip()


def generate_explanation(profile: dict, course: dict) -> str:
    """Two-sentence explanation of why this course fits this learner."""
    user_msg = (
        f"Learner goal: {profile.get('goal_text', '')}. "
        f"Target role: {profile.get('target_role', '')}. "
        f"Level: {profile.get('current_level', '')}. "
        f"Course: {course.get('title', '')} — {course.get('description', '')}"
    )
    return _call_groq(
        [
            {"role": "system", "content": _load_prompt("explain.txt")},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1200,
    )


def generate_path(user_id: str, profile: dict) -> dict:
    """Recommend courses, sequence them into milestones, persist, and return the path."""
    courses = get_recommender().recommend(profile)
    if not courses:
        raise ValueError("No courses returned from recommender")

    candidates_for_llm = [
        {
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "difficulty": c["difficulty"],
            "skill_tags": c.get("skill_tags", []),
            "duration_hrs": c.get("duration_hrs", 10),
        }
        for c in courses
    ]

    user_msg = f"""LEARNER PROFILE:
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
        milestones = json.loads(_strip_fences(_call_groq(messages)))["milestones"]

    path_result = supabase_client.table("learning_paths").insert({
        "user_id": user_id,
        "goal_text": profile.get("goal_text", ""),
        "status": "active",
    }).execute()
    path_id = path_result.data[0]["id"]

    course_lookup = {c["id"]: c for c in courses}

    response_milestones = []
    sequence_order = 0

    for m_idx, milestone in enumerate(milestones):
        steps = []
        for course_id in milestone.get("course_ids", []):
            course = course_lookup.get(course_id)
            if not course:
                # LLM hallucinated an id that wasn't in the candidate list — skip it.
                continue
            sequence_order += 1
            explanation = generate_explanation(profile, course)

            step_result = supabase_client.table("path_steps").insert({
                "path_id": path_id,
                "course_id": course_id,
                "sequence_order": sequence_order,
                "milestone_label": milestone["label"],
                "status": "not_started",
                "explanation": explanation,
            }).execute()
            step_id = step_result.data[0]["id"] if step_result.data else ""

            steps.append({
                "step_id": step_id,
                "course_id": course_id,
                "title": course.get("title", ""),
                "provider": course.get("provider", ""),
                "duration_hrs": course.get("duration_hrs", 0),
                "difficulty": course.get("difficulty", ""),
                "skill_tags": course.get("skill_tags", []),
                "resource_url": course.get("resource_url", ""),
                "explanation": explanation,
                "status": "not_started",
            })

        response_milestones.append({
            "label": milestone["label"],
            "sequence_order": m_idx + 1,
            "estimated_weeks": milestone.get("estimated_weeks", 2),
            "steps": steps,
        })

    return {"path_id": path_id, "milestones": response_milestones}


def get_path(path_id: str, user_id: str) -> dict:
    """Fetch a path with steps + course details from Supabase. Verifies ownership."""
    path_result = (
        supabase_client.table("learning_paths")
        .select("*")
        .eq("id", path_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not path_result.data:
        raise ValueError("Path not found or access denied")

    steps_result = (
        supabase_client.table("path_steps")
        .select("*, courses(id, title, provider, duration_hrs, difficulty, skill_tags, resource_url)")
        .eq("path_id", path_id)
        .order("sequence_order")
        .execute()
    )

    milestones_dict = {}
    for step in steps_result.data or []:
        label = step.get("milestone_label") or "Milestone"
        if label not in milestones_dict:
            milestones_dict[label] = {
                "label": label,
                "sequence_order": len(milestones_dict) + 1,
                "steps": [],
            }
        course = step.get("courses") or {}
        milestones_dict[label]["steps"].append({
            "step_id": step["id"],
            "course_id": step.get("course_id", ""),
            "title": course.get("title", ""),
            "provider": course.get("provider", ""),
            "duration_hrs": course.get("duration_hrs", 0),
            "difficulty": course.get("difficulty", ""),
            "skill_tags": course.get("skill_tags", []),
            "resource_url": course.get("resource_url", ""),
            "explanation": step.get("explanation", ""),
            "status": step.get("status", "not_started"),
        })

    return {"path_id": path_id, "milestones": list(milestones_dict.values())}


# ---------------------------------------------------------------- SWAP
# In-place single-step replacement — the sane alternative to nuking the whole
# path tail on every "not for me" or "too easy" click. See the audit in the
# team chat for why we moved away from tail-regeneration as the default.
_LEVEL_TIERS = ["beginner", "intermediate", "advanced"]


def _load_step_full(step_id: str, user_id: str) -> tuple[dict, dict]:
    """Fetch step + owning path + course; enforce ownership. Raises ValueError."""
    r = (
        supabase_client.table("path_steps")
        .select(
            "*, learning_paths!inner(id, user_id, goal_text), "
            "courses(id, title, description, provider, difficulty, "
            "duration_hrs, resource_url, skill_tags, prerequisites)"
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


def _score_alternative(candidate: dict, skipped_course: dict, target_diff: str) -> float:
    """Higher is better. Overlap on skill_tags + difficulty match beats similarity."""
    cand_tags = {t.lower() for t in (candidate.get("skill_tags") or [])}
    skipped_tags = {t.lower() for t in (skipped_course.get("skill_tags") or [])}
    overlap = len(cand_tags & skipped_tags) / max(len(cand_tags | skipped_tags), 1)  # Jaccard
    diff_match = 1.0 if (candidate.get("difficulty") == target_diff) else 0.0
    similarity = float(candidate.get("similarity") or 0.0)
    # Overlap dominates (weight 3), then diff match (2), then similarity (1).
    return 3.0 * overlap + 2.0 * diff_match + similarity


def swap_step(step_id: str, user_id: str, level_hint: int = 0) -> dict:
    """Replace a single step with the best available alternative.

    Args:
      step_id:    the step being swapped out.
      user_id:    caller (ownership-checked).
      level_hint: +1 = "too easy" (find a harder replacement), 0 = plain swap.

    Behavior:
      1. Marks the skipped step as `skipped` in place (kept for history).
      2. Bumps sequence_order of every later step in the path by +1.
      3. Inserts the alternative right after the skipped step in the same
         milestone, with a fresh grounded explanation.
      4. Writes a feedback_event so the mutation is auditable.
      5. Never touches the global profile.current_level - the too-easy signal
         only shapes THIS replacement.
    """
    step, path = _load_step_full(step_id, user_id)
    skipped_course = step.get("courses") or {}

    if step.get("status") in ("skipped", "completed"):
        return {"swapped": False, "reason": f"Step already {step['status']}"}

    # Fetch profile
    prof_r = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    if not prof_r.data:
        raise ValueError("Profile not found")
    profile = prof_r.data[0]

    # Target difficulty: current course level (+level_hint tiers).
    cur_diff = skipped_course.get("difficulty") or profile.get("current_level") or "beginner"
    cur_idx = _LEVEL_TIERS.index(cur_diff) if cur_diff in _LEVEL_TIERS else 0
    target_diff = _LEVEL_TIERS[max(0, min(len(_LEVEL_TIERS) - 1, cur_idx + level_hint))]

    # Recommender candidates
    candidates = get_recommender().recommend(profile) or []

    # Filter out anything already in this path (any status), completed elsewhere,
    # and the skipped course itself.
    in_path = {row["course_id"] for row in (supabase_client.table("path_steps")
               .select("course_id").eq("path_id", path["id"]).execute().data or [])
               if row.get("course_id")}
    completed_ids = set(profile.get("completed_courses") or [])
    excluded = in_path | completed_ids | {skipped_course.get("id")}

    candidates = [c for c in candidates if c.get("id") not in excluded]
    if not candidates:
        # No alternative available — mark skipped anyway, don't insert anything.
        _set_step_status_local(step_id, "skipped")
        _log_swap_event(user_id, path["id"], step_id, note="no alternative available")
        return {"swapped": False, "reason": "No alternative course available in the library"}

    # Rank
    candidates.sort(
        key=lambda c: _score_alternative(c, skipped_course, target_diff),
        reverse=True,
    )
    replacement = candidates[0]

    # Bump sequence_orders of everything after the skipped step, then insert.
    old_seq = int(step.get("sequence_order") or 0)
    _bump_later_sequences(path["id"], after=old_seq)
    _set_step_status_local(step_id, "skipped")

    explanation = generate_explanation(profile, replacement)
    inserted = supabase_client.table("path_steps").insert({
        "path_id": path["id"],
        "course_id": replacement["id"],
        "sequence_order": old_seq + 1,
        "milestone_label": step.get("milestone_label"),
        "status": "not_started",
        "explanation": explanation,
    }).execute()
    new_row = inserted.data[0] if inserted.data else None
    _log_swap_event(
        user_id, path["id"], step_id,
        note=f"swapped for {replacement.get('title')} (level_hint={level_hint})",
    )

    return {
        "swapped": True,
        "old_step_id": step_id,
        "new_step": {
            "step_id": new_row["id"] if new_row else "",
            "course_id": replacement["id"],
            "title": replacement.get("title", ""),
            "provider": replacement.get("provider", ""),
            "duration_hrs": replacement.get("duration_hrs", 0),
            "difficulty": replacement.get("difficulty", ""),
            "skill_tags": replacement.get("skill_tags", []),
            "resource_url": replacement.get("resource_url", ""),
            "milestone_label": step.get("milestone_label"),
            "explanation": explanation,
            "status": "not_started",
            "sequence_order": old_seq + 1,
        },
    }


def _set_step_status_local(step_id: str, status: str) -> None:
    supabase_client.table("path_steps").update({"status": status}).eq("id", step_id).execute()


def _bump_later_sequences(path_id: str, after: int) -> None:
    """Add +1 to sequence_order for every step in `path_id` with sequence_order > after."""
    later = (
        supabase_client.table("path_steps")
        .select("id, sequence_order")
        .eq("path_id", path_id)
        .gt("sequence_order", after)
        .execute()
    )
    # supabase-py has no bulk-update-with-expression; do individual updates in
    # descending order to avoid transient unique conflicts if we ever add one.
    for row in sorted(later.data or [], key=lambda r: r["sequence_order"], reverse=True):
        supabase_client.table("path_steps").update(
            {"sequence_order": row["sequence_order"] + 1}
        ).eq("id", row["id"]).execute()


def _log_swap_event(user_id: str, path_id: str, step_id: str, note: str) -> None:
    supabase_client.table("feedback_events").insert({
        "user_id": user_id,
        "path_id": path_id,
        "step_id": step_id,
        "event_type": "not_interested",  # reuse existing enum; note carries the semantic
        "note": note,
    }).execute()
