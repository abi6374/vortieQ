from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.middleware.rate_limit import rate_limit
from app.services import interview_service

router = APIRouter()


class StartSessionRequest(BaseModel):
    topic: Optional[str] = ""
    question_count: Optional[int] = 5


class SubmitAnswerRequest(BaseModel):
    session_id: str
    question_number: int
    total_questions: int
    current_question: dict
    transcript: str
    duration_sec: Optional[int] = 0


class FinalizeSessionRequest(BaseModel):
    session_id: str
    questions: List[dict]
    answers: List[dict]
    total_duration_sec: Optional[int] = 0


class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = "Joanna"


@router.post("/start")
def start_interview(
    payload: StartSessionRequest,
    user_id: str = Depends(rate_limit("interview.start", max_calls=15))
):
    """Starts an adaptive interview session grounded in the learner's profile and active roadmap."""
    try:
        res = interview_service.start_interview_session(
            user_id=user_id,
            topic_override=payload.topic or "",
            question_count=payload.question_count or 5
        )
        return res
    except Exception as e:
        raise HTTPException(500, f"Failed to start interview session: {str(e)}")


@router.post("/answer")
def submit_answer(
    payload: SubmitAnswerRequest,
    user_id: str = Depends(rate_limit("interview.answer", max_calls=30))
):
    """
    Evaluates candidate answer and adaptively generates the next Bedrock question in a single turn.
    """
    try:
        res = interview_service.process_interview_answer(
            user_id=user_id,
            session_id=payload.session_id,
            question_number=payload.question_number,
            total_questions=payload.total_questions,
            current_question=payload.current_question,
            transcript=payload.transcript,
            duration_sec=payload.duration_sec or 0
        )
        return res
    except Exception as e:
        raise HTTPException(500, f"Failed to process answer: {str(e)}")


@router.post("/finalize")
def finalize_interview(
    payload: FinalizeSessionRequest,
    user_id: str = Depends(rate_limit("interview.finalize", max_calls=15))
):
    """Generates the comprehensive final Bedrock assessment and roadmap recommendations."""
    try:
        res = interview_service.finalize_interview_session(
            user_id=user_id,
            session_id=payload.session_id,
            questions=payload.questions,
            answers=payload.answers,
            total_duration_sec=payload.total_duration_sec or 0
        )
        return res
    except Exception as e:
        raise HTTPException(500, f"Failed to finalize interview: {str(e)}")


@router.post("/tts")
def text_to_speech(
    payload: TTSRequest,
    user_id: str = Depends(rate_limit("interview.tts", max_calls=50))
):
    """Synthesizes question audio using Amazon Polly Neural TTS."""
    audio_bytes = interview_service.synthesize_speech_polly(
        text=payload.text,
        voice_id=payload.voice_id or "Joanna"
    )
    if not audio_bytes:
        raise HTTPException(503, "Amazon Polly service unavailable; use browser speech synthesis fallback.")

    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"}
    )
