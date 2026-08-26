from fastapi import APIRouter, Depends, HTTPException

from app.config import supabase_client
from app.middleware.auth import verify_jwt
from app.services import path_service

router = APIRouter()


@router.post("/generate")
def generate_path(user_id: str = Depends(verify_jwt)):
    profile_result = (
        supabase_client.table("profiles").select("*").eq("id", user_id).execute()
    )
    if not profile_result.data:
        raise HTTPException(404, "Profile not found. Create a profile first.")
    return path_service.generate_path(user_id, profile_result.data[0])


@router.get("/{path_id}")
def get_path(path_id: str, user_id: str = Depends(verify_jwt)):
    try:
        return path_service.get_path(path_id, user_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
