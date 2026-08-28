"""Account profile, settings, study sessions, and the derived learning streak."""

from datetime import date, timedelta

from app.config import supabase_client

DEFAULT_SETTINGS = {
    "weekly_hours": 10,
    "target_date": None,
    "email_notifications": True,
    "reminder_notifications": True,
    "ai_suggestions": True,
    "preferred_formats": ["course", "video", "article"],
    "difficulty_preference": "adaptive",
    "timezone": "UTC",
}

EDITABLE_PROFILE = ("full_name", "goal_text", "target_role", "current_level",
                    "interests", "weekly_hours")
EDITABLE_SETTINGS = tuple(DEFAULT_SETTINGS.keys())


# ── Account / profile ────────────────────────────────────────────────────────
def get_me(user_id: str) -> dict:
    """Profile + auth identity. The name shown in the UI comes from here, never
    from a hardcoded component value."""
    prof = supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    profile = prof.data[0] if prof.data else {}

    email, full_name = None, None
    try:
        u = supabase_client.auth.admin.get_user_by_id(user_id)
        if u and u.user:
            email = u.user.email
            meta = u.user.user_metadata or {}
            full_name = meta.get("full_name") or meta.get("name")
    except Exception as e:
        print(f"[account] could not read auth user: {type(e).__name__}: {e}", flush=True)

    return {
        "user_id": user_id,
        "email": email,
        # Prefer the profile's own full_name, fall back to auth metadata, then
        # the local part of the email — never a hardcoded string.
        "full_name": profile.get("full_name") or full_name or (email.split("@")[0] if email else "Learner"),
        "goal_text": profile.get("goal_text"),
        "target_role": profile.get("target_role"),
        "current_level": profile.get("current_level"),
        "interests": profile.get("interests") or [],
        "weekly_hours": profile.get("weekly_hours") or 10,
        "completed_courses": profile.get("completed_courses") or [],
    }


def update_me(user_id: str, patch: dict) -> dict:
    """Persist profile edits. Only whitelisted fields are writable."""
    clean = {k: v for k, v in patch.items() if k in EDITABLE_PROFILE and v is not None}
    if not clean:
        raise ValueError("No editable fields supplied")

    exists = supabase_client.table("profiles").select("id").eq("id", user_id).execute()
    if exists.data:
        supabase_client.table("profiles").update(clean).eq("id", user_id).execute()
    else:
        supabase_client.table("profiles").insert({"id": user_id, **clean}).execute()

    # weekly_hours lives on both profile and settings; keep them consistent.
    if "weekly_hours" in clean:
        _upsert_settings(user_id, {"weekly_hours": clean["weekly_hours"]})

    return get_me(user_id)


# ── Settings ─────────────────────────────────────────────────────────────────
def _upsert_settings(user_id: str, patch: dict) -> dict:
    existing = supabase_client.table("user_settings").select("user_id").eq("user_id", user_id).execute()
    if existing.data:
        supabase_client.table("user_settings").update(patch).eq("user_id", user_id).execute()
    else:
        supabase_client.table("user_settings").insert({"user_id": user_id, **patch}).execute()
    r = supabase_client.table("user_settings").select("*").eq("user_id", user_id).execute()
    return r.data[0] if r.data else {**DEFAULT_SETTINGS, "user_id": user_id}


def get_settings(user_id: str) -> dict:
    r = supabase_client.table("user_settings").select("*").eq("user_id", user_id).execute()
    if r.data:
        return r.data[0]
    # Lazily create defaults on first read so the UI always has a real row.
    return _upsert_settings(user_id, dict(DEFAULT_SETTINGS))


def update_settings(user_id: str, patch: dict) -> dict:
    clean = {k: v for k, v in patch.items() if k in EDITABLE_SETTINGS and v is not None}
    if not clean:
        raise ValueError("No editable settings supplied")

    settings = _upsert_settings(user_id, clean)

    # Changing weekly hours changes the plan shape, so mirror it onto the
    # profile and re-pack the roadmap's weeks to match the new budget.
    if "weekly_hours" in clean:
        supabase_client.table("profiles").update(
            {"weekly_hours": clean["weekly_hours"]}
        ).eq("id", user_id).execute()
        try:
            from app.services import roadmap_service
            path = (
                supabase_client.table("learning_paths").select("id")
                .eq("user_id", user_id).eq("status", "active")
                .order("generated_at", desc=True).limit(1).execute()
            )
            if path.data:
                roadmap_service.assign_week_numbers(path.data[0]["id"], int(clean["weekly_hours"]))
        except Exception as e:
            print(f"[settings] week re-pack failed: {type(e).__name__}: {e}", flush=True)

    return settings


# ── Study sessions + streak ──────────────────────────────────────────────────
def log_session(user_id: str, activity: str = "task_completed",
                minutes: int = 0, step_id: str | None = None) -> dict:
    row = {"user_id": user_id, "activity": activity, "minutes": max(0, int(minutes or 0))}
    if step_id:
        row["step_id"] = step_id
    supabase_client.table("study_sessions").insert(row).execute()
    return get_streak(user_id)


def get_streak(user_id: str) -> dict:
    """Current and best streak, derived from study_sessions.

    Rules: multiple sessions on one day count once. Today not yet studied does
    not break the streak (it's still 'current' if yesterday was active) — the
    streak only breaks once a full day is missed.
    """
    r = (
        supabase_client.table("study_sessions")
        .select("activity_date, minutes")
        .eq("user_id", user_id)
        .order("activity_date", desc=True)
        .limit(400)
        .execute()
    )
    rows = r.data or []
    if not rows:
        week_start = date.today() - timedelta(days=date.today().weekday())
        return {
            "current_streak": 0, "best_streak": 0, "active_today": False,
            "total_days": 0, "minutes_this_week": 0, "recent_days": [],
            "daily_minutes_this_week": [
                {"date": (week_start + timedelta(days=i)).isoformat(), "minutes": 0}
                for i in range(7)
            ],
        }

    days = sorted({row["activity_date"] for row in rows if row.get("activity_date")}, reverse=True)
    parsed = [date.fromisoformat(d) if isinstance(d, str) else d for d in days]
    today = date.today()
    active_today = bool(parsed) and parsed[0] == today

    # Current streak: walk back day by day from today (or yesterday if today
    # hasn't been studied yet).
    current = 0
    cursor = today if active_today else today - timedelta(days=1)
    dayset = set(parsed)
    while cursor in dayset:
        current += 1
        cursor -= timedelta(days=1)

    # Best streak: longest consecutive run anywhere in the history.
    best, run, prev = 0, 0, None
    for d in sorted(parsed):
        run = run + 1 if (prev is not None and (d - prev).days == 1) else 1
        best = max(best, run)
        prev = d

    week_start = today - timedelta(days=today.weekday())

    def _row_date(row: dict):
        d = row.get("activity_date")
        return date.fromisoformat(d) if isinstance(d, str) else d

    minutes_week = sum(
        (row.get("minutes") or 0) for row in rows
        if _row_date(row) and _row_date(row) >= week_start
    )

    # Real per-day breakdown for this calendar week (Mon..Sun), summed from
    # actual study_sessions rows - no fabricated hours, days with zero real
    # activity just show 0.
    daily_minutes = {(week_start + timedelta(days=i)).isoformat(): 0 for i in range(7)}
    for row in rows:
        d = _row_date(row)
        if d and d.isoformat() in daily_minutes:
            daily_minutes[d.isoformat()] += row.get("minutes") or 0

    return {
        "current_streak": current,
        "best_streak": max(best, current),
        "active_today": active_today,
        "total_days": len(parsed),
        "minutes_this_week": minutes_week,
        "recent_days": [d.isoformat() for d in parsed[:35]],
        "daily_minutes_this_week": [
            {"date": iso, "minutes": mins} for iso, mins in daily_minutes.items()
        ],
    }
