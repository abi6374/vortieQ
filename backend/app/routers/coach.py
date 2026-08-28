from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_jwt
from app.services import coach_service

router = APIRouter()


class PracticeRequest(BaseModel):
    topic: str
    count: int = 5


@router.post("/practice")
def practice(payload: PracticeRequest, user_id: str = Depends(verify_jwt)):
    try:
        questions = coach_service.generate_practice(user_id, payload.topic, payload.count)
        return {"questions": questions}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/project-idea")
def project_idea(user_id: str = Depends(verify_jwt)):
    try:
        return coach_service.generate_project_idea(user_id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
