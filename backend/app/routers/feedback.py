from fastapi import APIRouter, Body, Depends, Header, HTTPException

from app.middleware.rate_limit import rate_limit
from app.schemas.feedback import FeedbackCreateSchema
from app.services import feedback_service, idempotency_service, path_service

router = APIRouter()


@router.post("/{step_id}/feedback")
def post_feedback(
    step_id: str,
    payload: FeedbackCreateSchema,
    user_id: str = Depends(rate_limit("steps.feedback", max_calls=20)),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Optional Idempotency-Key header: too_easy/too_hard/not_interested/
    resource_unavailable can each trigger path_service.swap_step (a real
    catalog-insert-capable mutation) plus a mastery-evidence write - a
    duplicate click/retry with the SAME key replays the first real result
    instead of double-applying the mastery update or risking a second
    distinct replacement course for one logical action."""
    cached = idempotency_service.check_and_reserve(idempotency_key, user_id, "steps.feedback")
    if cached is not None:
        if cached["status"] >= 400:
            raise HTTPException(cached["status"], cached["body"])
        return cached["body"]

    try:
        result = feedback_service.handle_feedback(
            step_id=step_id,
            event_type=payload.event_type,
            note=payload.note,
            user_id=user_id,
        )
        idempotency_service.store_result(idempotency_key, 200, result)
        return result
    except ValueError as e:
        msg = str(e)
        status = 404 if "not found" in msg.lower() else 400
        idempotency_service.store_result(idempotency_key, status, {"detail": msg})
        raise HTTPException(status, msg)


@router.post("/{step_id}/swap")
def swap_step(
    step_id: str,
    payload: dict = Body(default={}),
    user_id: str = Depends(rate_limit("steps.swap", max_calls=20)),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    """Replace one step with an alternative. `level_hint`: 0 = same level,
    1 = harder (the "too easy" signal). No global profile mutation happens.

    Optional Idempotency-Key header: see /rerecommend's docstring - a
    duplicate click with the same key replays the first real swap result
    instead of risking a second distinct replacement course for one click.
    """
    level_hint = int(payload.get("level_hint") or 0)

    cached = idempotency_service.check_and_reserve(idempotency_key, user_id, "steps.swap")
    if cached is not None:
        if cached["status"] >= 400:
            raise HTTPException(cached["status"], cached["body"])
        return cached["body"]

    try:
        result = path_service.swap_step(step_id, user_id, level_hint=level_hint)
        idempotency_service.store_result(idempotency_key, 200, result)
        return result
    except ValueError as e:
        msg = str(e)
        status = 404 if "not found" in msg.lower() else 400
        idempotency_service.store_result(idempotency_key, status, {"detail": msg})
        raise HTTPException(status, msg)
