from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_jwt
from app.services import assistant_service

router = APIRouter()


class AskSchema(BaseModel):
    question: str
    path_id: str


@router.post("/ask")
def ask(payload: AskSchema, user_id: str = Depends(verify_jwt)):
    try:
        answer = assistant_service.ask(
            question=payload.question,
            path_id=payload.path_id,
            user_id=user_id,
        )
        return {"answer": answer}
    except ValueError as e:
        raise HTTPException(404, str(e))
