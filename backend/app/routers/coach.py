from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.rate_limit import rate_limit
from app.services import coach_service

router = APIRouter()


class PracticeRequest(BaseModel):
    topic: str
    count: int = 5


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
