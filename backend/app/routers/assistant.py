from pydantic import BaseModel
from fastapi import APIRouter, Depends

from app.middleware.auth import verify_jwt

router = APIRouter()


class AskSchema(BaseModel):
    question: str
    path_id: str


@router.post("/ask")
def ask(payload: AskSchema, user_id: str = Depends(verify_jwt)):
    return {"message": "not implemented"}
