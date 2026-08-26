from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt
from app.schemas.profile import ProfileCreateSchema

router = APIRouter()


@router.post("/")
def create_profile(
    payload: ProfileCreateSchema,
    user_id: str = Depends(verify_jwt),
):
    return {"message": "not implemented"}
