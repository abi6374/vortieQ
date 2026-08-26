from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt
from app.schemas.profile import ProfileCreateSchema
from app.services import profile_service

router = APIRouter()


@router.post("/")
def create_or_update_profile(
    payload: ProfileCreateSchema,
    user_id: str = Depends(verify_jwt),
):
    extracted = profile_service.extract_profile(payload.goal_text)
    extracted["goal_text"] = payload.goal_text
    return profile_service.upsert_profile(user_id, extracted)
