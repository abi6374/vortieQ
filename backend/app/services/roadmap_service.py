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

from datetime import datetime, timezone

from app.config import supabase_client
from app.services import web_search_service

TERMINAL = ("completed", "skipped")


def bump_path_version(path_id: str) -> dict | None:
    """Real-time-ish freshness signal (learning_paths.version/
    last_recomputed_at, migration 008): a client can cheaply detect a stale
    cached roadmap by comparing `version` instead of a blind refresh timer,
    and every response carries a real timestamp of when the path was
    actually last recomputed. Called from every real path mutation (task
    completion, swap, rerecommend). Best-effort - never blocks the real
    mutation that triggered it.

    Returns {"version", "last_recomputed_at"} on success so a caller (e.g.
    feedback_service) can echo the real new version back in its own
    response instead of the client having to re-fetch the whole roadmap
    just to learn it changed. Returns None on failure - callers must not
    treat that as "version 0".

    Database-reliability audit: this used to be SELECT version, compute +1
    in Python, then UPDATE - a classic lost-update race. Two concurrent
    mutations on the same path (two tabs, a fast double-click hitting two
    different action buttons) could both read the same version and both
    write the same "+1", silently losing one increment. Now a single
    UPDATE...RETURNING via the bump_path_version RPC (migration 017) -
    Postgres's own row lock during the UPDATE serializes concurrent callers
    correctly with no lost increments, because it's one atomic statement
    instead of a read then a separate write."""
    try:
        rows = supabase_client.rpc("bump_path_version", {"p_path_id": path_id}).execute().data
        if not rows:
            return None
        return {"version": rows[0]["version"], "last_recomputed_at": rows[0]["last_recomputed_at"]}
    except Exception as e:
        print(f"[roadmap] path version bump failed for {path_id}: {type(e).__name__}: {e}", flush=True)
        return None

# ── part-splitting schema support ───────────────────────────────────────────
# migration 002_course_parts.sql adds part_number/part_total/part_hours to
# path_steps so a course longer than a week's real hour budget can span
# multiple weeks as separate trackable parts ("Part 1 of 2", etc.) instead of
# silently overshooting that week's hour total. This check lets the app
# degrade gracefully (no splitting, identical to pre-migration behavior)
# instead of hard-breaking the live roadmap endpoint if that migration hasn't
# been run against this DB yet - cached after the first check per process.
_parts_schema_checked = None


def _has_parts_schema() -> bool:
    global _parts_schema_checked
    if _parts_schema_checked is None:
        try:
            supabase_client.table("path_steps").select("part_number").limit(1).execute()
            _parts_schema_checked = True
        except Exception:
            _parts_schema_checked = False
    return _parts_schema_checked


def _split_course_into_parts(duration_hrs: float, weekly_hours: float, week: int, used: float):
    """Walk a running per-week hour cursor, splitting `duration_hrs` worth of
    work into as many parts as needed so no single week gets more than
    `weekly_hours` of new work. Returns (parts, new_week, new_used) where each
    part is {"week_number": int, "part_hours": float}."""
    parts = []
    remaining = max(0.25, float(duration_hrs or 3))
    while remaining > 1e-9:
        if used >= weekly_hours:
            week += 1
            used = 0.0
        available = weekly_hours - used
        if available <= 0:
            available = remaining  # weekly_hours misconfigured (<=0) - avoid an infinite loop
        take = min(available, remaining)
        parts.append({"week_number": week, "part_hours": round(take, 2)})
        remaining -= take
        used += take
    return parts, week, used


def plan_weeks_with_splits(course_specs: list[dict], weekly_hours: float = 10) -> list[list[dict]]:
    """course_specs: ordered [{course_id, duration_hrs}, ...], one entry per
    logical (not-yet-split) course. Returns a list of the SAME length, where
    result[i] is the list of {week_number, part_number, part_total, part_hours}
    parts for course_specs[i] - exactly 1 part when the course fits in the
    remaining budget of a single week, more when it has to spill into
    subsequent weeks.

    Real hour-based bin-packing: walks a running per-week hour budget and only
    advances to the next week once the current week's real hours are used up.
    The previous approach (dividing course count by an average duration) could
    not represent a course spanning multiple weeks at all - long courses just
    silently made a week's real total overshoot the learner's stated budget.
    """
    weekly_hours = float(weekly_hours or 10)
    if weekly_hours <= 0:
        weekly_hours = 10
    week, used = 1, 0.0
    result = []
    for spec in course_specs:
        parts, week, used = _split_course_into_parts(spec.get("duration_hrs"), weekly_hours, week, used)
        total = len(parts)
        result.append([{**p, "part_number": i, "part_total": total} for i, p in enumerate(parts, start=1)])
    return result


# ── loading ──────────────────────────────────────────────────────────────────
def _active_path(user_id: str) -> dict | None:
    r = (
        supabase_client.table("learning_paths")
        .select("id, goal_text, status, generated_at, version, last_recomputed_at")
        .eq("user_id", user_id).eq("status", "active")
        .order("generated_at", desc=True).limit(1).execute()
    )
    return r.data[0] if r.data else None


def _steps_for(path_id: str) -> list:
    fields = ("id, sequence_order, week_number, milestone_label, status, explanation, "
              "completed_at, course_id, "
              "courses(id, title, description, provider, difficulty, duration_hrs, resource_url, skill_tags)")
    if _has_parts_schema():
        fields = fields.replace("completed_at, course_id,", "completed_at, course_id, part_number, part_total, part_hours,")

    r = (
        supabase_client.table("path_steps")
        .select(fields)
        .eq("path_id", path_id).order("sequence_order").execute()
    )
    out = []
    for s in r.data or []:
        c = s.get("courses") or {}
        full_hrs = c.get("duration_hrs", 0)
        # part_hours (this part's real hours) when the course was split, else
        # the whole course's real duration - either way this is the number
        # that should count toward a week's real hour total.
        part_hours = s.get("part_hours")
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
            "duration_hrs": part_hours if part_hours is not None else full_hrs,
            "full_duration_hrs": full_hrs,
            "part_number": s.get("part_number") or 1,
            "part_total": s.get("part_total") or 1,
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

    # Only enrich the current week + the next 2 upcoming ones with live web
    # search — that's what's actually relevant to the learner right now, and
    # it keeps the common case (loading your dashboard) fast even before the
    # cache warms up. Everything else gets an empty list, not a missing key.
    relevant = [w for w in weeks if current is not None and current <= w["week_number"] <= current + 2]
    web_search_service.enrich_with_web_resources(relevant, label_key="milestone_label", steps_key="steps")
    for w in weeks:
        w.setdefault("web_resources", [])

    # Real target_role from the profile (not a client-side regex guess at
    # goal_text) - lets the frontend show a real short header ("Data
    # Analyst") instead of the whole goal sentence.
    prof = supabase_client.table("profiles").select("target_role").eq("id", user_id).execute()
    target_role = (prof.data[0].get("target_role") if prof.data else "") or ""

    return {
        "path": {
            "id": path["id"], "goal_text": path.get("goal_text"), "status": path.get("status"),
            "target_role": target_role,
            # Real freshness signal (migration 008) - a client can compare
            # `version` to detect a stale cached roadmap instead of a blind
            # refresh timer, per the audit's real-time-behavior requirement.
            "version": path.get("version") or 1,
            "last_recomputed_at": path.get("last_recomputed_at"),
        },
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
    fields = (
        "id, path_id, week_number, status, course_id, "
        "learning_paths!inner(id, user_id), courses(duration_hrs, skill_tags)"
    )
    if _has_parts_schema():
        fields = fields.replace("course_id,", "course_id, part_hours,")
    r = (
        supabase_client.table("path_steps")
        .select(fields)
        .eq("id", step_id).execute()
    )
    if not r.data:
        raise ValueError("Task not found")
    step = r.data[0]
    if (step.get("learning_paths") or {}).get("user_id") != user_id:
        raise ValueError("Task not found")
    return step


def set_task_completion(
    step_id: str, user_id: str, completed: bool, note: str = "",
    rating: int = None, tag: str = ""
) -> dict:
    """Mark a task complete or INCOMPLETE. Both directions persist.

    Completing is blocked unless every earlier week is finished — enforced here,
    not just in the UI.

    `note`, `rating` (1-5 stars), `tag`: learner's real feedback on this task.
    Stored as a real feedback_events row and applied IMMEDIATELY (not gated
    on finishing the task's whole week) to reconsider the not-started tail
    of the path's course selection (see feedback_service.
    apply_recent_feedback). Ignored on un-complete (nothing to act on there).
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

    if completed:
        # Real (weak) positive mastery evidence - this is the actual
        # frontend completion path (PersonalizedRoadmap's checkbox ->
        # useRoadmap.toggleTask -> here), so this is where real completion
        # evidence needs to land, not just in the separate
        # feedback_service.handle_feedback route. See mastery_service for
        # why this only ever raises a floor, never claims expert mastery
        # from one completion.
        try:
            from app.services import mastery_service
            skill_tags = (step.get("courses") or {}).get("skill_tags") or []
            mastery_service.update_mastery_from_completion(user_id, skill_tags)
        except Exception as e:
            print(f"[roadmap] mastery update from completion failed: {type(e).__name__}: {e}", flush=True)

    if completed and (note or rating or tag):
        feedback_content = []
        if rating:
            feedback_content.append(f"Rating: {rating}/5 stars")
        if tag:
            feedback_content.append(f"Tag: {tag}")
        if note and note.strip():
            feedback_content.append(note.strip())
        combined_note = " | ".join(feedback_content)[:1000]

        try:
            supabase_client.table("feedback_events").insert({
                "user_id": user_id, "path_id": path_id, "step_id": step_id,
                "event_type": "completed", "note": combined_note,
            }).execute()
        except Exception as e:
            print(f"[roadmap] feedback note write failed: {type(e).__name__}: {e}", flush=True)

        # Real-time, not week-gated: this feedback is applied to the
        # not-started tail of the path immediately, the moment it's left -
        # it used to wait until every remaining step in the CURRENT week
        # was also terminal, which meant feedback on the first task of a
        # 5-task week sat unused until the other four were done too. See
        # feedback_service.apply_recent_feedback.
        try:
            from app.services import feedback_service
            feedback_service.apply_recent_feedback(path_id, user_id, combined_note)
        except Exception as e:
            print(f"[roadmap] recent-feedback application failed: {type(e).__name__}: {e}", flush=True)

    # Keep profiles.completed_courses in step with the toggle, both directions,
    # so the recommender never re-suggests something the learner just finished.
    #
    # Database-reliability audit: this used to be SELECT completed_courses,
    # modify the array in Python, UPDATE the whole array - a lost-update
    # race under concurrent completions (two tabs completing different
    # steps of the same learner around the same time could each read a
    # stale array and clobber the other's change). set_course_completion_
    # flag (migration 017) does the add/remove as one array-expression
    # UPDATE Postgres serializes on its own row lock - no read-then-write
    # window for a concurrent call to land in.
    course_id = step.get("course_id")
    if course_id:
        current_statuses = (
            supabase_client.table("path_steps")
            .select("status").eq("path_id", path_id).eq("course_id", course_id).execute()
        ).data or []
        course_fully_done = bool(current_statuses) and all(s.get("status") in TERMINAL for s in current_statuses)
        try:
            supabase_client.rpc("set_course_completion_flag", {
                "p_user_id": user_id, "p_course_id": course_id, "p_done": course_fully_done,
            }).execute()
        except Exception as e:
            print(f"[roadmap] completed_courses flag update failed: {type(e).__name__}: {e}", flush=True)

    if completed:
        try:
            from app.services import account_service
            part_hours = step.get("part_hours")
            full_hours = (step.get("courses") or {}).get("duration_hrs") or 0
            duration_hrs = part_hours if part_hours is not None else full_hours
            account_service.log_session(
                user_id, activity="task_completed", step_id=step_id,
                minutes=round(duration_hrs * 60),
            )
        except Exception as e:
            print(f"[roadmap] study session log failed: {type(e).__name__}: {e}", flush=True)

    bump_path_version(path_id)

    # Return the whole recomputed roadmap so every dependent view can refresh
    # from one response instead of firing extra requests.
    return get_roadmap(user_id)


def rerecommend_task(
    step_id: str, user_id: str, preference: str = "custom", note: str = ""
) -> dict:
    """Re-recommends a single week course based on learner preferences and
    returns the recomputed roadmap, enriched with the real reason for the
    change and any unmet prerequisite this swap surfaced (see
    path_service.swap_step_with_preference - this is the actual reachable
    "too hard"/"too easy" signal in the live app, via the 'too_advanced'/
    'too_basic' preference options, and it updates real mastery evidence
    before this function ever runs). Previously this data was computed and
    then silently discarded here in favor of the plain roadmap object."""
    from app.services import path_service
    res = path_service.swap_step_with_preference(
        step_id=step_id, user_id=user_id, preference=preference, note=note
    )
    if not res.get("swapped"):
        raise ValueError(res.get("reason", "Could not re-recommend course for this week"))
    roadmap = get_roadmap(user_id)
    roadmap["reason_for_change"] = res.get("reason_for_change")
    roadmap["unmet_prerequisites"] = res.get("unmet_prerequisites") or []
    return roadmap


def assign_week_numbers(path_id: str, weekly_hours: int = 10) -> None:
    """(Re)plan week numbers for a path's NOT-YET-STARTED steps, splitting a
    course across multiple weeks (multiple path_steps rows sharing one
    course_id, "Part 1 of 2" etc.) if its real duration doesn't fit the
    learner's weekly hour budget in one week.

    Completed/skipped steps are never touched - their week already happened
    for them - which is what makes this safe to call again later when
    weekly_hours changes (see account_service.update_settings) without
    disturbing history. Pending work is re-planned to start the week right
    after whatever's already done, so it never conflicts with it.

    Falls back to the old simple "average duration -> steps per week"
    behavior (no splitting) if migration 002_course_parts.sql hasn't been run
    against this DB yet - never hard-fails path generation over this.
    """
    has_parts = _has_parts_schema()
    fields = "id, sequence_order, course_id, milestone_label, explanation, status, week_number, courses(duration_hrs)"
    rows = (
        supabase_client.table("path_steps").select(fields)
        .eq("path_id", path_id).order("sequence_order").execute()
    ).data or []
    if not rows:
        return

    if not has_parts:
        # Pre-migration fallback: identical to the original behavior.
        durations = [((s.get("courses") or {}).get("duration_hrs") or 5) for s in rows]
        avg = sum(durations) / len(durations) if durations else 5
        per_week = max(1, round((weekly_hours or 10) / avg)) if avg else 1
        for idx, s in enumerate(rows):
            supabase_client.table("path_steps").update(
                {"week_number": (idx // per_week) + 1}
            ).eq("id", s["id"]).execute()
        return

    done_rows = [r for r in rows if r.get("status") in TERMINAL]
    pending_rows = [r for r in rows if r.get("status") not in TERMINAL]
    if not pending_rows:
        return  # nothing left to (re)plan

    start_week = (max((r.get("week_number") or 1) for r in done_rows) + 1) if done_rows else 1

    # Collapse pending rows back to one logical course entry per distinct
    # course_id run (in sequence order) - a previously-split course is
    # re-split fresh against the current weekly_hours rather than compounding
    # whatever split it had before.
    course_specs = []
    pending_by_course: dict[str, list[dict]] = {}
    for row in pending_rows:
        cid = row["course_id"]
        pending_by_course.setdefault(cid, []).append(row)
        if len(pending_by_course[cid]) == 1:
            duration = (row.get("courses") or {}).get("duration_hrs") or 3
            course_specs.append({"course_id": cid, "duration_hrs": duration})

    split_plan = plan_weeks_with_splits(course_specs, weekly_hours)
    for parts in split_plan:  # plan_weeks_with_splits always starts at week 1
        for p in parts:
            p["week_number"] += start_week - 1

    next_seq = max((r.get("sequence_order") or 0) for r in rows) + 1
    for spec, parts in zip(course_specs, split_plan):
        existing = pending_by_course[spec["course_id"]]
        for i, part in enumerate(parts):
            if i < len(existing):
                supabase_client.table("path_steps").update({
                    "week_number": part["week_number"],
                    "part_number": part["part_number"],
                    "part_total": part["part_total"],
                    "part_hours": part["part_hours"],
                }).eq("id", existing[i]["id"]).execute()
            else:
                # Now needs MORE parts than before (weekly_hours went down) -
                # clone a new row from this course's first existing row
                # (same explanation/milestone_label/course_id).
                base = existing[0]
                supabase_client.table("path_steps").insert({
                    "path_id": path_id,
                    "course_id": spec["course_id"],
                    "sequence_order": next_seq,
                    "milestone_label": base.get("milestone_label"),
                    "status": "not_started",
                    "explanation": base.get("explanation"),
                    "week_number": part["week_number"],
                    "part_number": part["part_number"],
                    "part_total": part["part_total"],
                    "part_hours": part["part_hours"],
                }).execute()
                next_seq += 1
        # Now needs FEWER parts than before (weekly_hours went up) - drop the
        # extra not_started rows for this course.
        if len(parts) < len(existing):
            for extra in existing[len(parts):]:
                supabase_client.table("path_steps").delete().eq("id", extra["id"]).execute()
