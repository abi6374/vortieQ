from fastapi import APIRouter, Depends, Header, HTTPException

from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.schemas.roadmap import RerecommendSchema, TaskCompletionSchema
from app.services import idempotency_service, roadmap_service

router = APIRouter()


@router.get("")
@router.get("/")
def get_roadmap(user_id: str = Depends(verify_jwt)):
    """The learner's active roadmap grouped into weeks, with current-week and
    lock state computed server-side."""
    return roadmap_service.get_roadmap(user_id)


@router.get("/week/{week_number}")
def get_week(week_number: int, user_id: str = Depends(verify_jwt)):
    try:
        return roadmap_service.get_week(user_id, week_number)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.patch("/tasks/{step_id}")
def set_task(
    step_id: str,
    payload: TaskCompletionSchema,
    user_id: str = Depends(verify_jwt),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Toggle a task complete/incomplete. `note`, `rating`, `tag`: the
    learner's real feedback on this task. Returns the full recomputed
    roadmap.

    Optional Idempotency-Key header: completion writes a mastery-evidence
    row AND can trigger apply_recent_feedback (a real LLM+web-search call
    that can insert a new course into the shared catalog and swap it into
    the path) - a duplicate click/retry with the SAME key replays the
    first real result instead of double-applying either.
    """
    cached = idempotency_service.check_and_reserve(idempotency_key, user_id, "roadmap.set_task")
    if cached is not None:
        if cached["status"] >= 400:
            raise HTTPException(cached["status"], cached["body"])
        return cached["body"]

    try:
        result = roadmap_service.set_task_completion(
            step_id=step_id, user_id=user_id, completed=payload.completed,
            note=payload.note, rating=payload.rating, tag=payload.tag,
        )
        idempotency_service.store_result(idempotency_key, 200, result)
        return result
    except PermissionError as e:
        # Prerequisite violation — 409 so the UI can show the lock message.
        idempotency_service.store_result(idempotency_key, 409, {"detail": str(e)})
        raise HTTPException(409, str(e))
    except ValueError as e:
        idempotency_service.store_result(idempotency_key, 404, {"detail": str(e)})
        raise HTTPException(404, str(e))


@router.post("/rerecommend")
def rerecommend_step(
    payload: RerecommendSchema,
    # Real gap this closes: every other LLM-backed mutation route (paths.generate,
    # steps.swap, steps.feedback) is rate-limited (see middleware/rate_limit.py's
    # own docstring on why) but this one wasn't, despite doing up to 3 live web
    # searches PLUS an LLM call per request - an authenticated user could script
    # unbounded cost/load against it with no cap at all.
    user_id: str = Depends(rate_limit("roadmap.rerecommend", max_calls=10)),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Re-recommends a single week course based on learner preferences.

    Optional Idempotency-Key header: a duplicate click / retried request
    with the SAME key replays the first real result instead of firing a
    second live web-search+LLM call and potentially inserting a second,
    different "new" course into the shared catalog for what the learner
    experienced as one click ("duplicate course insertion has race/
    duplicate risks" from the audit).
    """
    cached = idempotency_service.check_and_reserve(idempotency_key, user_id, "roadmap.rerecommend")
    if cached is not None:
        if cached["status"] >= 400:
            raise HTTPException(cached["status"], cached["body"])
        return cached["body"]

    try:
        result = roadmap_service.rerecommend_task(
            step_id=payload.step_id,
            user_id=user_id,
            preference=payload.preference,
            note=payload.note,
        )
        idempotency_service.store_result(idempotency_key, 200, result)
        return result
    except ValueError as e:
        idempotency_service.store_result(idempotency_key, 400, {"detail": str(e)})
        raise HTTPException(400, str(e))
    except Exception as e:
        idempotency_service.store_result(idempotency_key, 500, {"detail": "Re-recommendation failed"})
        raise HTTPException(500, f"Re-recommendation failed: {e}")

