from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, HTTPException

from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.services import internship_service

router = APIRouter()


@router.get("")
def list_internships(
    is_remote: Optional[bool] = Query(None),
    category: Optional[str] = Query(None, max_length=100, description="AI/ML, Web Dev, Data Science, DevOps, etc."),
    company: Optional[str] = Query(None, max_length=200, description="Filter by company name"),
    # Real, though not costly-per-call - still worth a cap since this can
    # hit the live Greenhouse Public Job Board API on a cache miss.
    user_id: str = Depends(rate_limit("internships.list", max_calls=60)),
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
    # Subset of user_internships.application_status's real DB CHECK
    # constraint (migration 015 - widened in place to add 'tracked')
    # relevant to this apply/save/bookmark action -
    # "interviewing"/"offer"/"rejected" are set via the separate PATCH
    # /status route below, not here.
    status: Literal["tracked", "applied", "saved"] = Query("tracked"),
    user_id: str = Depends(verify_jwt),
):
    """
    Track that the user has tracked, applied to, or saved this internship.
    Persists to Supabase user_internships table.
    """
    try:
        result = internship_service.apply_to_internship(user_id, internship_id, status=status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        print(f"[internships router] apply_to_internship failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to apply to this internship. Please try again.")


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
        print(f"[internships router] unapply_from_internship failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to remove this application. Please try again.")


@router.patch("/{internship_id}/status")
def update_internship_status(
    internship_id: str,
    # Matches user_internships.application_status's full real DB CHECK
    # constraint (migration 015 - widened in place to add 'tracked')
    # exactly.
    new_status: Literal["tracked", "applied", "saved", "interviewing", "offer", "rejected"] = Query(...),
    user_id: str = Depends(verify_jwt),
):
    """Update the application status for a tracked internship."""
    try:
        result = internship_service.update_application_status(user_id, internship_id, new_status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        print(f"[internships router] update_application_status failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to update application status. Please try again.")

