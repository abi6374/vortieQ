from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.middleware.auth import verify_jwt
from app.services import hackathon_service

router = APIRouter()


class RegisterRequest(BaseModel):
    hackathon_id: str


@router.get("")
def list_hackathons(
    status: Optional[str] = Query(None, description="upcoming | ongoing | ended"),
    theme: Optional[str] = Query(None, description="AI/ML, Web, FinTech, etc."),
    is_online: Optional[bool] = Query(None),
    user_id: str = Depends(verify_jwt),
):
    """
    List real hackathons from Devfolio/Devpost via Apify (if token set)
    or Devfolio scraper fallback. Results are personalized to the user's profile.
    """
    filters = {}
    if status:
        filters["status"] = status
    if theme:
        filters["theme"] = theme
    if is_online is not None:
        filters["is_online"] = is_online

    hackathons = hackathon_service.get_hackathons(filters)
    return {
        "count": len(hackathons),
        "hackathons": hackathons,
        "source": "apify" if hackathon_service.APIFY_TOKEN else "devfolio_scraper"
    }


@router.get("/user/mine")
def get_my_hackathons(user_id: str = Depends(verify_jwt)):
    """Get hackathons the current user has registered for."""
    hackathons = hackathon_service.get_user_hackathons(user_id)
    return {"count": len(hackathons), "hackathons": hackathons}


@router.get("/{hackathon_id}")
def get_hackathon_detail(
    hackathon_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Get full details for a single hackathon."""
    hackathon = hackathon_service.get_hackathon_by_id(hackathon_id)
    if not hackathon:
        raise HTTPException(status_code=404, detail="Hackathon not found")
    return hackathon


@router.post("/{hackathon_id}/register")
def register_for_hackathon(
    hackathon_id: str,
    user_id: str = Depends(verify_jwt),
):
    """
    Register the current user for a hackathon.
    Records the registration in Supabase user_hackathons table.
    """
    try:
        result = hackathon_service.register_for_hackathon(user_id, hackathon_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/refresh")
def refresh_hackathons(user_id: str = Depends(verify_jwt)):
    """Manually trigger a hackathon data refresh from external sources."""
    hackathon_service._CACHE.clear()
    hackathons = hackathon_service.get_hackathons()
    return {"refreshed": True, "count": len(hackathons)}
