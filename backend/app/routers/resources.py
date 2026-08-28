from fastapi import APIRouter, Depends, Query

from app.middleware.auth import verify_jwt
from app.services import web_search_service

router = APIRouter()


@router.get("/search")
def search_resources(
    query: str = Query(..., min_length=2, max_length=200),
    user_id: str = Depends(verify_jwt),
):
    """
    Live web-search recommendations to supplement the seeded course library
    (e.g. NPTEL courses, or anything else not in the fixed 80-course set).
    Auth-gated like every other endpoint, but doesn't touch the DB — it's a
    pure pass-through to web_search_service, which never raises.
    """
    results = web_search_service.search_learning_resources(query)
    return {"query": query, "results": results}
