from fastapi import APIRouter, Body, Depends, HTTPException

from app.middleware.auth import verify_jwt
from app.services import account_service

router = APIRouter()


# ── Account ──────────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(user_id: str = Depends(verify_jwt)):
    """The authenticated learner's real profile — the source of truth for the
    name shown anywhere in the UI."""
    return account_service.get_me(user_id)


@router.patch("/me/profile")
def update_me(payload: dict = Body(...), user_id: str = Depends(verify_jwt)):
    try:
        return account_service.update_me(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Settings ─────────────────────────────────────────────────────────────────
@router.get("/settings")
def get_settings(user_id: str = Depends(verify_jwt)):
    return account_service.get_settings(user_id)


@router.patch("/settings")
def update_settings(payload: dict = Body(...), user_id: str = Depends(verify_jwt)):
    """Persist preferences. Changing weekly_hours also re-packs the roadmap's
    weeks so the plan actually reflects the new budget."""
    try:
        return account_service.update_settings(user_id, payload)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Study sessions / streak ──────────────────────────────────────────────────
@router.post("/study-sessions")
def log_session(payload: dict = Body(default={}), user_id: str = Depends(verify_jwt)):
    """Record qualifying learning activity. Returns the recomputed streak."""
    return account_service.log_session(
        user_id=user_id,
        activity=payload.get("activity", "manual"),
        minutes=payload.get("minutes", 0),
        step_id=payload.get("step_id"),
    )


@router.get("/streak")
def get_streak(user_id: str = Depends(verify_jwt)):
    """Current/best streak derived from real study_sessions rows — never a
    hardcoded number."""
    return account_service.get_streak(user_id)
