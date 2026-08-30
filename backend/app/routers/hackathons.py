from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.services import hackathon_service

router = APIRouter()


class RegisterRequest(BaseModel):
    hackathon_id: str


@router.get("")
def list_hackathons(
    status: Optional[str] = Query(None, max_length=50, description="upcoming | ongoing | ended"),
    theme: Optional[str] = Query(None, max_length=100, description="AI/ML, Web, FinTech, etc."),
    is_online: Optional[bool] = Query(None),
    # Real, though not costly-per-call like path generation - still worth
    # a generous cap since this can trigger an Apify/scraper call
    # (hackathon_service.get_hackathons) on a cache miss.
    user_id: str = Depends(rate_limit("hackathons.list", max_calls=60)),
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
    # Matches user_hackathons.status's real DB CHECK constraint
    # (migration 015) exactly - previously a bare string, so any other
    # value would only ever be caught by the DB itself, surfacing as the
    # RuntimeError/500 branch below (and, before this fix, leaking the
    # raw Postgres error string to the client).
    status: Literal["tracked", "saved", "registered", "interested", "submitted"] = Query("tracked"),
    user_id: str = Depends(verify_jwt),
):
    """
    Track user registration or interest for a hackathon.
    Records the status in Supabase user_hackathons table (persistent).
    """
    try:
        result = hackathon_service.register_for_hackathon(user_id, hackathon_id, status=status)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        # Real exception details (a raw Postgres/Supabase error string,
        # which can reveal table/column/constraint names) go to server
        # logs only - the client gets a generic, safe message.
        print(f"[hackathons router] register_for_hackathon failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to register for this hackathon. Please try again.")


@router.delete("/{hackathon_id}/register")
def unregister_from_hackathon(
    hackathon_id: str,
    user_id: str = Depends(verify_jwt),
):
    """Remove a hackathon from the user's tracked registrations."""
    try:
        result = hackathon_service.unregister_from_hackathon(user_id, hackathon_id)
        return result
    except RuntimeError as e:
        print(f"[hackathons router] unregister_from_hackathon failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to remove this registration. Please try again.")


@router.post("/refresh")
def refresh_hackathons(
    # Real cost/DoS gap this closes: hackathon_service._CACHE is a
    # process-wide (not per-user) cache - any authenticated learner could
    # previously force a full external re-scrape (Apify/Devfolio) for
    # EVERY user with no limit at all, repeatedly.
    user_id: str = Depends(rate_limit("hackathons.refresh", max_calls=3)),
):
    """Manually trigger a hackathon data refresh from external sources."""
    hackathon_service._CACHE.clear()
    hackathons = hackathon_service.get_hackathons()
    return {"refreshed": True, "count": len(hackathons)}
