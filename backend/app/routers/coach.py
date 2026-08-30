from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.middleware.rate_limit import rate_limit
from app.services import coach_service

router = APIRouter()


class PracticeRequest(BaseModel):
    # topic had no length limit at all despite going directly into
    # coach_service.generate_practice's LLM prompt ("TOPIC TO PRACTICE:
    # {topic}") - real prompt-injection surface and unbounded per-request
    # cost. count was already safely clamped inside the service
    # (max(1, min(MAX_QUESTIONS, ...))) but enforcing it here too turns an
    # out-of-range request into a clean 422 instead of a silently-adjusted
    # value the caller never sees reflected back.
    topic: str = Field(..., min_length=1, max_length=200)
    count: int = Field(default=5, ge=1, le=10)  # matches coach_service.MAX_QUESTIONS


@router.post("/practice")
def practice(payload: PracticeRequest, user_id: str = Depends(rate_limit("coach.practice", max_calls=10))):
    try:
        questions = coach_service.generate_practice(user_id, payload.topic, payload.count)
        return {"questions": questions}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/project-idea")
def project_idea(user_id: str = Depends(rate_limit("coach.project_idea", max_calls=10))):
    try:
        return coach_service.generate_project_idea(user_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
