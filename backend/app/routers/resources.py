from fastapi import APIRouter, Depends, Query

from app.middleware.rate_limit import rate_limit
from app.services import web_search_service

router = APIRouter()


@router.get("/search")
def search_resources(
    query: str = Query(..., min_length=2, max_length=200),
    # Real cost gap this closes: authenticated but had no rate limit at
    # all despite triggering a live web search per call - every other
    # search-triggering route in this app (swap/rerecommend, path
    # generation) is rate-limited for exactly this reason.
    user_id: str = Depends(rate_limit("resources.search", max_calls=30)),
):
    """
    Live web-search recommendations to supplement the seeded course library
    (e.g. NPTEL courses, or anything else not in the fixed 80-course set).
    Auth-gated like every other endpoint, but doesn't touch the DB — it's a
    pure pass-through to web_search_service, which never raises.
    """
    results = web_search_service.search_learning_resources(query)
    return {"query": query, "results": results}
