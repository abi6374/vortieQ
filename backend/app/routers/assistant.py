from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.services import conversation_service

router = APIRouter()


class AskSchema(BaseModel):
    question: str
    path_id: str | None = None      # legacy callers still send this
    page_context: str | None = None  # 'roadmap' | 'progress' | 'skills' | 'resources'


@router.post("/ask")
def ask(payload: AskSchema, user_id: str = Depends(rate_limit("assistant.ask", max_calls=30))):
    """Legacy single-shot endpoint, kept so existing callers don't break.

    Now backed by the persistent conversation, so a question asked here shows
    up in the shared thread too.
    """
    try:
        result = conversation_service.ask(
            user_id=user_id,
            question=payload.question,
            page_context=payload.page_context or "",
        )
        return {"answer": result["answer"]}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


# ── Shared persistent conversation ───────────────────────────────────────────
@router.get("/conversation")
def get_conversation(user_id: str = Depends(verify_jwt)):
    """Full message history for the signed-in learner. Powers the single shared
    AI Coach so the thread survives navigation and reloads."""
    return {"messages": conversation_service.get_messages(user_id)}


class MessageSchema(BaseModel):
    content: str
    page_context: str | None = None


@router.post("/messages")
def post_message(payload: MessageSchema, user_id: str = Depends(rate_limit("assistant.messages", max_calls=30))):
    """Send a message to the shared conversation; returns both the stored user
    message and the assistant's reply."""
    try:
        return conversation_service.ask(
            user_id=user_id,
            question=payload.content,
            page_context=payload.page_context or "",
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.delete("/conversation")
def clear_conversation(user_id: str = Depends(verify_jwt)):
    conversation_service.clear_conversation(user_id)
    return {"cleared": True}
