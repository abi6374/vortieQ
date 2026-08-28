"""Week-based roadmap state, completion, and prerequisite enforcement.

Week state is DERIVED from path_steps.week_number rather than stored in a
separate table, so there is exactly one source of truth and nothing to keep in
sync. A week is:
  - complete   : every step in it is completed (or skipped)
  - current    : the lowest incomplete week
  - locked     : any week above the current one whose predecessors aren't done
  - accessible : week <= current week

Prerequisite locking is enforced HERE, server-side — the UI lock is only a
mirror of this, so a crafted request can't complete week 5 first.
"""

from app.config import supabase_client

TERMINAL = ("completed", "skipped")


# ── loading ──────────────────────────────────────────────────────────────────
def _active_path(user_id: str) -> dict | None:
    r = (
        supabase_client.table("learning_paths")
        .select("id, goal_text, status, generated_at")
        .eq("user_id", user_id).eq("status", "active")
        .order("generated_at", desc=True).limit(1).execute()
    )
    return r.data[0] if r.data else None


def _steps_for(path_id: str) -> list:
    r = (
        supabase_client.table("path_steps")
        .select("id, sequence_order, week_number, milestone_label, status, explanation, "
                "completed_at, course_id, "
                "courses(id, title, description, provider, difficulty, duration_hrs, resource_url, skill_tags)")
        .eq("path_id", path_id).order("sequence_order").execute()
    )
    out = []
    for s in r.data or []:
        c = s.get("courses") or {}
        out.append({
            "step_id": s["id"],
            "course_id": s.get("course_id"),
            "sequence_order": s.get("sequence_order"),
            "week_number": s.get("week_number") or 1,
            "milestone_label": s.get("milestone_label"),
            "status": s.get("status", "not_started"),
            "completed": s.get("status") == "completed",
            "completed_at": s.get("completed_at"),
            "explanation": s.get("explanation", ""),
            "title": c.get("title", ""),
            "description": c.get("description", ""),
            "provider": c.get("provider", ""),
            "difficulty": c.get("difficulty", ""),
            "duration_hrs": c.get("duration_hrs", 0),
            "resource_url": c.get("resource_url", ""),
            "skill_tags": c.get("skill_tags") or [],
        })
    return out


def _assemble_weeks(steps: list) -> tuple[list, int]:
    """Group steps into weeks and compute current/locked. Returns (weeks, current_week)."""
    by_week: dict[int, list] = {}
    for s in steps:
        by_week.setdefault(s["week_number"], []).append(s)

    ordered = sorted(by_week.keys())
    # current week = lowest week that still has non-terminal steps
    current = None
    for w in ordered:
        if any(s["status"] not in TERMINAL for s in by_week[w]):
            current = w
            break
    if current is None:
        current = ordered[-1] if ordered else 1

    weeks = []
    for w in ordered:
        wsteps = by_week[w]
        done = sum(1 for s in wsteps if s["status"] in TERMINAL)
        complete = done == len(wsteps) and len(wsteps) > 0
        weeks.append({
            "week_number": w,
            "label": f"Week {w}",
            "milestone_label": wsteps[0].get("milestone_label"),
            "steps": wsteps,
            "total_steps": len(wsteps),
            "completed_steps": done,
            "percent": round((done / len(wsteps)) * 100) if wsteps else 0,
            "is_complete": complete,
            "is_current": w == current,
            # A week is accessible if it's the current one, earlier, or every
            # week before it is fully complete.
            "is_locked": w > current,
            "locked_reason": (f"Complete the previous week to access Week {w}." if w > current else None),
        })
    return weeks, current


def get_roadmap(user_id: str) -> dict:
    path = _active_path(user_id)
    if not path:
        return {"path": None, "weeks": [], "current_week": None,
                "total_steps": 0, "completed_steps": 0, "percent": 0}

    steps = _steps_for(path["id"])
    weeks, current = _assemble_weeks(steps)
    done = sum(1 for s in steps if s["status"] in TERMINAL)
    return {
        "path": {"id": path["id"], "goal_text": path.get("goal_text"), "status": path.get("status")},
        "weeks": weeks,
        "current_week": current,
        "total_steps": len(steps),
        "completed_steps": done,
        "percent": round((done / len(steps)) * 100) if steps else 0,
    }


def get_week(user_id: str, week_number: int) -> dict:
    data = get_roadmap(user_id)
    for w in data["weeks"]:
        if w["week_number"] == week_number:
            return {"path": data["path"], "current_week": data["current_week"], "week": w}
    raise ValueError(f"Week {week_number} not found")


# ── mutation ─────────────────────────────────────────────────────────────────
def _owned_step(step_id: str, user_id: str) -> dict:
    r = (
        supabase_client.table("path_steps")
        .select("id, path_id, week_number, status, course_id, learning_paths!inner(id, user_id)")
        .eq("id", step_id).execute()
    )
    if not r.data:
        raise ValueError("Task not found")
    step = r.data[0]
    if (step.get("learning_paths") or {}).get("user_id") != user_id:
        raise ValueError("Task not found")
    return step


def set_task_completion(step_id: str, user_id: str, completed: bool) -> dict:
    """Mark a task complete or INCOMPLETE. Both directions persist.

    Completing is blocked unless every earlier week is finished — enforced here,
    not just in the UI.
    """
    step = _owned_step(step_id, user_id)
    path_id = step["path_id"]
    week = step.get("week_number") or 1

    if completed:
        # Prerequisite gate: all strictly-earlier weeks must be terminal.
        earlier = (
            supabase_client.table("path_steps")
            .select("id, week_number, status")
            .eq("path_id", path_id).lt("week_number", week).execute()
        )
        blocking = [s for s in (earlier.data or []) if s.get("status") not in TERMINAL]
        if blocking:
            first_open = min(s["week_number"] for s in blocking)
            raise PermissionError(
                f"Complete Week {first_open} before working on Week {week}."
            )

    new_status = "completed" if completed else "not_started"
    supabase_client.table("path_steps").update({"status": new_status}).eq("id", step_id).execute()

    # Keep profiles.completed_courses in step with the toggle, both directions,
    # so the recommender never re-suggests something the learner just finished
    # (and does re-suggest it if they un-complete it).
    course_id = step.get("course_id")
    if course_id:
        prof = supabase_client.table("profiles").select("completed_courses").eq("id", user_id).execute()
        ids = list((prof.data[0].get("completed_courses") if prof.data else None) or [])
        changed = False
        if completed and course_id not in ids:
            ids.append(course_id); changed = True
        elif not completed and course_id in ids:
            ids = [i for i in ids if i != course_id]; changed = True
        if changed:
            supabase_client.table("profiles").update({"completed_courses": ids}).eq("id", user_id).execute()

    # Completing a task is qualifying learning activity — log it so the streak
    # on Progress is derived from what the learner actually did.
    if completed:
        try:
            from app.services import account_service
            account_service.log_session(user_id, activity="task_completed", step_id=step_id)
        except Exception as e:
            print(f"[roadmap] study session log failed: {type(e).__name__}: {e}", flush=True)

    # Return the whole recomputed roadmap so every dependent view can refresh
    # from one response instead of firing extra requests.
    return get_roadmap(user_id)


def assign_week_numbers(path_id: str, weekly_hours: int = 10) -> None:
    """Assign contiguous week numbers to a freshly generated path.

    Packs steps per week based on the learner's weekly budget vs typical course
    length, so a 10 h/week learner doesn't get a 1-step-per-week roadmap.
    """
    r = (
        supabase_client.table("path_steps")
        .select("id, sequence_order, courses(duration_hrs)")
        .eq("path_id", path_id).order("sequence_order").execute()
    )
    rows = r.data or []
    if not rows:
        return
    durations = [((s.get("courses") or {}).get("duration_hrs") or 5) for s in rows]
    avg = sum(durations) / len(durations) if durations else 5
    per_week = max(1, round((weekly_hours or 10) / avg)) if avg else 1

    for idx, s in enumerate(rows):
        week = (idx // per_week) + 1
        supabase_client.table("path_steps").update({"week_number": week}).eq("id", s["id"]).execute()
