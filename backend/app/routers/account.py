from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_jwt
from app.schemas.account import ProfileUpdateSchema, SettingsUpdateSchema, StudySessionSchema
from app.services import account_service

router = APIRouter()


# ── Account ──────────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(user_id: str = Depends(verify_jwt)):
    """The authenticated learner's real profile — the source of truth for the
    name shown anywhere in the UI."""
    return account_service.get_me(user_id)


@router.patch("/me/profile")
def update_me(payload: ProfileUpdateSchema, user_id: str = Depends(verify_jwt)):
    # exclude_none: this is a PATCH - only fields the caller actually set
    # are forwarded, same partial-update contract the old dict-based body
    # had (account_service.update_me already filters unknown keys and
    # None values itself; this keeps that behavior while adding real
    # type/length/range validation at the schema boundary).
    try:
        return account_service.update_me(user_id, payload.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Settings ─────────────────────────────────────────────────────────────────
@router.get("/settings")
def get_settings(user_id: str = Depends(verify_jwt)):
    return account_service.get_settings(user_id)


@router.patch("/settings")
def update_settings(payload: SettingsUpdateSchema, user_id: str = Depends(verify_jwt)):
    """Persist preferences. Changing weekly_hours also re-packs the roadmap's
    weeks so the plan actually reflects the new budget."""
    clean = payload.model_dump(exclude_none=True)
    if "target_date" in clean:
        clean["target_date"] = clean["target_date"].isoformat()
    try:
        return account_service.update_settings(user_id, clean)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Study sessions / streak ──────────────────────────────────────────────────
@router.post("/study-sessions")
def log_session(payload: StudySessionSchema, user_id: str = Depends(verify_jwt)):
    """Record qualifying learning activity. Returns the recomputed streak."""
    return account_service.log_session(
        user_id=user_id,
        activity=payload.activity,
        minutes=payload.minutes,
        step_id=payload.step_id,
    )


@router.get("/streak")
def get_streak(user_id: str = Depends(verify_jwt)):
    """Current/best streak derived from real study_sessions rows — never a
    hardcoded number."""
    return account_service.get_streak(user_id)
