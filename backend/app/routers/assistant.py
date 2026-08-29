from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.services import conversation_service

router = APIRouter()

# Bounds both the LLM prompt-injection surface and per-request token cost —
# same reasoning as ProfileCreateSchema.goal_text (see schemas/profile.py).
# Previously these had no length cap at all, so an arbitrarily large payload
# could reach the LLM call directly.
_MAX_QUESTION_LEN = 4000
_MAX_PAGE_CONTEXT_LEN = 40  # generous for the known values ('roadmap', 'progress', ...)


class AskSchema(BaseModel):
    question: str = Field(..., min_length=1, max_length=_MAX_QUESTION_LEN)
    path_id: str | None = None      # legacy callers still send this
    # 'roadmap' | 'progress' | 'skills' | 'resources' — not enforced as a
    # strict enum (new page names shouldn't need a backend change), just
    # length-bounded.
    page_context: str | None = Field(default=None, max_length=_MAX_PAGE_CONTEXT_LEN)


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
    content: str = Field(..., min_length=1, max_length=_MAX_QUESTION_LEN)
    page_context: str | None = Field(default=None, max_length=_MAX_PAGE_CONTEXT_LEN)


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
