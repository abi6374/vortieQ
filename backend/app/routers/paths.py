from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import supabase_client
from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.services import feedback_service, idempotency_service, path_service

router = APIRouter()


class GeneratePathPayload(BaseModel):
    goal_text: str | None = None
    goal: str | None = None
    target_role: str | None = None
    weekly_hours: int | None = None
    target_weeks: int | None = None
    resume_topics: list[dict] | None = None

    class Config:
        extra = "ignore"


@router.post("/generate")
def generate_path(
    payload: GeneratePathPayload | None = None,
    user_id: str = Depends(rate_limit("paths.generate", max_calls=5)),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Real, confirmed production bug this fixes: found two rows both
    marked status='active' in learning_paths for the same real user
    during live verification this session - generate_path had no
    protection at all against being called twice for one learner (the
    frontend's own retry-after-apparent-failure flow, runPlan/retryPlan,
    can genuinely double-submit if the FIRST call actually succeeded
    server-side but the client thought it failed due to a network
    timeout). Idempotency-Key protects the "exact same request retried"
    case; path_service.generate_path itself now also archives any
    pre-existing active path before creating the new one, so "at most one
    active path per user" holds even for a genuinely distinct second call
    with no shared key (e.g. two browser tabs).
    """
    cached = idempotency_service.check_and_reserve(idempotency_key, user_id, "paths.generate")
    if cached is not None:
        if cached["status"] >= 400:
            raise HTTPException(cached["status"], cached["body"])
        return cached["body"]

    profile_result = (
        supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    )
    if not profile_result.data:
        idempotency_service.store_result(idempotency_key, 404, {"detail": "Profile not found. Create a profile first."})
        raise HTTPException(404, "Profile not found. Create a profile first.")

    profile_data = dict(profile_result.data[0])
    if payload:
        if payload.target_weeks is not None:
            profile_data["target_weeks"] = payload.target_weeks
        if payload.weekly_hours is not None:
            profile_data["weekly_hours"] = payload.weekly_hours
        if payload.goal_text:
            profile_data["goal_text"] = payload.goal_text
        if payload.target_role:
            profile_data["target_role"] = payload.target_role

    try:
        result = path_service.generate_path(user_id, profile_data)
        idempotency_service.store_result(idempotency_key, 200, result)
        return result
    except ValueError as e:
        idempotency_service.store_result(idempotency_key, 400, {"detail": str(e)})
        raise HTTPException(400, str(e))


@router.get("/{path_id}")
def get_path(path_id: str, user_id: str = Depends(verify_jwt)):
    try:
        return path_service.get_path(path_id, user_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{path_id}/rebuild-tail")
def rebuild_tail(path_id: str, user_id: str = Depends(rate_limit("paths.rebuild_tail", max_calls=3))):
    """Escape-hatch: full regeneration of the not_started tail of the path.

    Not called from the normal feedback flow anymore (that uses per-step swap).
    Requires an explicit user action + confirmation from the frontend.
    """
    # Verify ownership first
    owned = (
        supabase_client.table("learning_paths")
        .select("id")
        .eq("id", path_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not owned.data:
        raise HTTPException(404, "Path not found")
    try:
        return feedback_service.rebuild_tail_full(None, user_id, path_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
