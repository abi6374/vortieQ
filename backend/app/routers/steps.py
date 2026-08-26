from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt

router = APIRouter()


@router.get("/{path_id}/steps")
def list_steps(path_id: str, user_id: str = Depends(verify_jwt)):
    return {"message": "not implemented"}
