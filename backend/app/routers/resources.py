from fastapi import APIRouter, Depends, Query

from app.middleware.rate_limit import rate_limit
from app.services import web_search_service

router = APIRouter()


@router.get("/search")
def search_resources(
    query: str = Query(..., min_length=2, max_length=200),
    # "" (default/generic), "docs", "article", "video", or "free_practice" -
    # see web_search_service.search_learning_resources. Was accepted by the
    # service function but never actually exposed here, so every manual
    # search always used the same generic query regardless of what kind of
    # resource the learner actually wanted.
    category: str = Query("", max_length=20),
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
    valid_categories = {"", "docs", "article", "video", "free_practice"}
    safe_category = category if category in valid_categories else ""
    results = web_search_service.search_learning_resources(query, category=safe_category)
    return {"query": query, "results": results}
