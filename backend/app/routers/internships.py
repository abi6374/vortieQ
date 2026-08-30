from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.middleware.auth import verify_jwt
from app.services import internship_service

router = APIRouter()


@router.get("")
def list_internships(
    is_remote: Optional[bool] = Query(None),
    category: Optional[str] = Query(None, description="AI/ML, Web Dev, Data Science, DevOps, etc."),
    company: Optional[str] = Query(None, description="Filter by company name"),
    user_id: str = Depends(verify_jwt),
):
    """
    List real internships fetched from the Greenhouse Public Job Board API.
    No authentication required on the Greenhouse side — data is always live.
    """
    filters = {}
    if is_remote is not None:
        filters["is_remote"] = is_remote
    if category:
        filters["category"] = category
    if company:
        filters["company"] = company

    internships = internship_service.get_internships(filters)
    return {
        "count": len(internships),
        "internships": internships,
        "source": "greenhouse_public_api"
    }


@router.get("/user/mine")
def get_my_internships(user_id: str = Depends(verify_jwt)):
    """Get all internships the current user has applied to."""
    internships = internship_service.get_user_internships(user_id)
    return {"count": len(internships), "internships": internships}


@router.get("/{internship_id}")
def get_internship_detail(
    internship_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Get full details for a single internship."""
    internship = internship_service.get_internship_by_id(internship_id)
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    return internship


@router.post("/{internship_id}/apply")
def apply_to_internship(
    internship_id: str,
    status: str = Query("applied", description="applied | saved"),
    user_id: str = Depends(verify_jwt),
):
    """
    Track that the user has applied to or saved this internship.
    Persists to Supabase user_internships table.
    """
    try:
        result = internship_service.apply_to_internship(user_id, internship_id, status=status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{internship_id}/apply")
def unapply_from_internship(
    internship_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Remove an internship from user's tracked applications."""
    try:
        result = internship_service.unapply_from_internship(user_id, internship_id)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{internship_id}/status")
def update_internship_status(
    internship_id: str,
    new_status: str = Query(..., description="applied | saved | interviewing | offer | rejected"),
    user_id: str = Depends(verify_jwt),
):
    """Update the application status for a tracked internship."""
    try:
        result = internship_service.update_application_status(user_id, internship_id, new_status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

