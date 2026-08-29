from fastapi import APIRouter, Body, Depends, HTTPException

from app.middleware.auth import verify_jwt
from app.services import roadmap_service

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
    payload: dict = Body(...),
    user_id: str = Depends(verify_jwt),
):
    """Toggle a task complete/incomplete. Body: {"completed": true|false, "note": str?}.

    `note`: the learner's real feedback on this task - the frontend makes
    this mandatory before a completion goes through. Ignored on un-complete.

    Returns the full recomputed roadmap so Progress, Skill insights and the
    week strip can all refresh from one response.
    """
    if "completed" not in payload:
        raise HTTPException(400, "Body must include 'completed' (true or false)")
    try:
        return roadmap_service.set_task_completion(
            step_id=step_id, user_id=user_id, completed=bool(payload["completed"]),
            note=str(payload.get("note") or ""),
        )
    except PermissionError as e:
        # Prerequisite violation — 409 so the UI can show the lock message.
        raise HTTPException(409, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))
