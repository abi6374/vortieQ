from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt
from app.schemas.feedback import FeedbackCreateSchema

router = APIRouter()


@router.post("/{step_id}/feedback")
def post_feedback(
    step_id: str,
    payload: FeedbackCreateSchema,
    user_id: str = Depends(verify_jwt),
):
    return {"message": "not implemented"}
