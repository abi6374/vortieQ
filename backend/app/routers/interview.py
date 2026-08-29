from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.rate_limit import rate_limit
from app.services import interview_service

router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    topic: Optional[str] = ""
    count: Optional[int] = 4


class AnswerItem(BaseModel):
    question_id: str
    transcript: str
    duration_sec: Optional[int] = 0


class EvaluateInterviewRequest(BaseModel):
    topic: Optional[str] = ""
    questions: List[dict]
    answers: List[AnswerItem]
    duration_sec: Optional[int] = 0


@router.post("/questions")
def get_interview_questions(
    payload: GenerateQuestionsRequest,
    user_id: str = Depends(rate_limit("interview.questions", max_calls=15))
):
    try:
        questions = interview_service.generate_interview_questions(
            user_id,
            topic=payload.topic or "",
            question_count=min(10, max(1, payload.count or 4))
        )
        return {"questions": questions}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error generating interview questions: {str(e)}")


@router.post("/evaluate")
def evaluate_interview(
    payload: EvaluateInterviewRequest,
    user_id: str = Depends(rate_limit("interview.evaluate", max_calls=10))
):
    try:
        answers_dict = [a.model_dump() for a in payload.answers]
        result = interview_service.evaluate_interview(
            user_id=user_id,
            topic=payload.topic or "",
            questions=payload.questions,
            answers=answers_dict,
            duration_sec=payload.duration_sec or 0
        )
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error evaluating interview: {str(e)}")
