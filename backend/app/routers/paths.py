from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt

router = APIRouter()


@router.post("/generate")
def generate_path(user_id: str = Depends(verify_jwt)):
    return {"message": "not implemented"}


@router.get("/{path_id}")
def get_path(path_id: str, user_id: str = Depends(verify_jwt)):
    return {"message": "not implemented"}
