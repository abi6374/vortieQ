from fastapi import APIRouter, Body, Depends, HTTPException

from app.middleware.auth import verify_jwt
from app.schemas.feedback import FeedbackCreateSchema
from app.services import feedback_service, path_service

router = APIRouter()


@router.post("/{step_id}/feedback")
def post_feedback(
    step_id: str,
    payload: FeedbackCreateSchema,
    user_id: str = Depends(verify_jwt),
):
    try:
        return feedback_service.handle_feedback(
            step_id=step_id,
            event_type=payload.event_type,
            note=payload.note,
            user_id=user_id,
        )
    except ValueError as e:
        msg = str(e)
        status = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status, msg)


@router.post("/{step_id}/swap")
def swap_step(
    step_id: str,
    payload: dict = Body(default={}),
    user_id: str = Depends(verify_jwt),
):
    """Replace one step with an alternative. `level_hint`: 0 = same level,
    1 = harder (the "too easy" signal). No global profile mutation happens."""
    level_hint = int(payload.get("level_hint") or 0)
    try:
        return path_service.swap_step(step_id, user_id, level_hint=level_hint)
    except ValueError as e:
        msg = str(e)
        status = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status, msg)
