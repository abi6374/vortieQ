from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.middleware.auth import verify_jwt
from app.schemas.profile import ProfileCreateSchema, ResumeExtractResponse
from app.services import profile_service, resume_service

router = APIRouter()


@router.post("/")
def create_or_update_profile(
    payload: ProfileCreateSchema,
    user_id: str = Depends(verify_jwt),
):
    extracted = profile_service.extract_profile(payload.goal_text)
    extracted["goal_text"] = payload.goal_text

    # If the caller (onboarding wizard, after the resume + assessment steps)
    # supplied per-topic ratings, merge them into the profile so the recommender
    # weights those topics.
    if payload.topic_ratings:
        extracted = profile_service.merge_topic_ratings(
            extracted, [t.model_dump() for t in payload.topic_ratings]
        )
    if payload.detected_years_experience is not None:
        extracted["detected_years_experience"] = payload.detected_years_experience

    return profile_service.upsert_profile(user_id, extracted)


@router.post("/resume", response_model=ResumeExtractResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_jwt),
):
    """Parse a resume (PDF/DOCX) and return extracted topics + suggested levels.

    This endpoint is pure extraction — the frontend shows the topics, lets the
    user adjust levels, then POSTs them back via /api/profile/ with the
    `topic_ratings` field. Persistence of the raw file lands in Phase 2.
    """
    try:
        data = await file.read()
        text = resume_service.extract_text(
            data, file.filename or "", file.content_type or ""
        )
        result = resume_service.extract_topics(text)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
