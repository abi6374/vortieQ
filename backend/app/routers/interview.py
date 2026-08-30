from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.middleware.rate_limit import rate_limit
from app.services import interview_service

router = APIRouter()

# Bounds both the LLM prompt-injection surface and per-request token/TTS
# cost - previously every one of these fields (topic, transcript, tts
# text, questions/answers lists, the free-form current_question dict) had
# no length or size limit at all, despite each one feeding either a real
# Bedrock call or a real Polly (per-character-billed) call.
_MAX_TOPIC_LEN = 200
_MAX_TRANSCRIPT_LEN = 8000  # a spoken answer, generously bounded
_MAX_TTS_TEXT_LEN = 3000    # Polly is billed per character
_MAX_QUESTIONS_PER_SESSION = 20


class StartSessionRequest(BaseModel):
    topic: Optional[str] = Field(default="", max_length=_MAX_TOPIC_LEN)
    question_count: Optional[int] = Field(default=5, ge=1, le=_MAX_QUESTIONS_PER_SESSION)


class InterviewQuestion(BaseModel):
    """Real shape produced by interview_service - was a bare `dict`."""
    id: str
    question: str = Field(..., max_length=2000)
    category: str = Field(default="", max_length=200)
    difficulty: str = Field(default="medium", max_length=50)
    skill_focus: str = Field(default="", max_length=200)
    key_criteria: list[str] = Field(default_factory=list, max_length=20)
    model_answer_summary: str = Field(default="", max_length=2000)


class AnswerEvaluation(BaseModel):
    """Real shape produced by interview_service - was implicitly folded
    into a bare `dict` on the FinalizeSessionRequest.answers list."""
    question_id: str = ""
    score: int = Field(default=0, ge=0, le=100)
    verdict: str = Field(default="", max_length=50)
    strengths: list[str] = Field(default_factory=list, max_length=20)
    missing_concepts: list[str] = Field(default_factory=list, max_length=20)
    feedback: str = Field(default="", max_length=2000)


class SubmittedAnswer(BaseModel):
    question_id: Optional[str] = None
    question_number: Optional[int] = Field(default=None, ge=1, le=_MAX_QUESTIONS_PER_SESSION)
    transcript: str = Field(default="", max_length=_MAX_TRANSCRIPT_LEN)
    answer_evaluation: Optional[AnswerEvaluation] = None


class SubmitAnswerRequest(BaseModel):
    session_id: str = Field(..., max_length=200)
    question_number: int = Field(..., ge=1, le=_MAX_QUESTIONS_PER_SESSION)
    total_questions: int = Field(..., ge=1, le=_MAX_QUESTIONS_PER_SESSION)
    current_question: InterviewQuestion
    transcript: str = Field(default="", max_length=_MAX_TRANSCRIPT_LEN)
    duration_sec: Optional[int] = Field(default=0, ge=0, le=24 * 3600)


class FinalizeSessionRequest(BaseModel):
    session_id: str = Field(..., max_length=200)
    questions: list[InterviewQuestion] = Field(..., max_length=_MAX_QUESTIONS_PER_SESSION)
    answers: list[SubmittedAnswer] = Field(..., max_length=_MAX_QUESTIONS_PER_SESSION)
    total_duration_sec: Optional[int] = Field(default=0, ge=0, le=24 * 3600)


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=_MAX_TTS_TEXT_LEN)
    voice_id: Optional[str] = Field(default="Joanna", max_length=50)


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
        # Real exception details (which could include internal error text,
        # a stack-adjacent message, etc.) go to server logs only - the
        # client gets a generic, safe message. Previously str(e) was
        # interpolated directly into the HTTPException detail, which is
        # exactly the raw-internals leak app.main's global handler already
        # prevents for UNHANDLED exceptions - this explicit re-raise
        # bypassed that protection.
        print(f"[interview router] start_interview_session failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(500, "Failed to start interview session. Please try again.")


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
            current_question=payload.current_question.model_dump(),
            transcript=payload.transcript,
            duration_sec=payload.duration_sec or 0
        )
        return res
    except Exception as e:
        print(f"[interview router] process_interview_answer failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(500, "Failed to process answer. Please try again.")


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
            questions=[q.model_dump() for q in payload.questions],
            answers=[a.model_dump() for a in payload.answers],
            total_duration_sec=payload.total_duration_sec or 0
        )
        return res
    except Exception as e:
        print(f"[interview router] finalize_interview_session failed: {type(e).__name__}: {e}", flush=True)
        raise HTTPException(500, "Failed to finalize interview. Please try again.")


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
