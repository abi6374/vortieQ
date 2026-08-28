from fastapi import APIRouter, Depends, HTTPException

from app.config import supabase_client
from app.middleware.auth import verify_jwt
from app.services import feedback_service, path_service

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


@router.post("/{path_id}/rebuild-tail")
def rebuild_tail(path_id: str, user_id: str = Depends(verify_jwt)):
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
