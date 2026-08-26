from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth import verify_jwt
from app.schemas.feedback import FeedbackCreateSchema
from app.services import feedback_service

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
        # "Step not found" / "Profile not found" / "Unknown event_type"
        msg = str(e)
        status = 404 if "not found" in msg.lower() else 400
        raise HTTPException(status, msg)
