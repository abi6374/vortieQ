import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import supabase_client
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


# ── Resume: upload + persist ─────────────────────────────────────────────────
# Storage layout: `resumes` bucket, object key = "{user_id}/{uuid}.{ext}".
# RLS on storage.objects (from the earlier migration) constrains the anon
# client to this prefix; the service role we use here bypasses RLS, so this
# code just has to write into the correct prefix to keep the model consistent.


def _ext_for(filename: str, content_type: str) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf") or "pdf" in (content_type or "").lower():
        return "pdf"
    if name.endswith(".docx") or "wordprocessingml" in (content_type or "").lower():
        return "docx"
    return "bin"


@router.post("/resume", response_model=ResumeExtractResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_jwt),
):
    """Parse a resume (PDF/DOCX), persist it to Storage + `resumes` table, and
    return extracted topics + suggested levels.

    Storage + row insert are best-effort: extraction is the contract the
    frontend depends on, so if either persistence step fails we log and still
    return the parse result (the user's flow doesn't break). A GET on
    /api/profile/resume surfaces the most recent stored resume for reuse.
    """
    try:
        data = await file.read()
        text = resume_service.extract_text(
            data, file.filename or "", file.content_type or ""
        )
        result = resume_service.extract_topics(text)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # ── Persist (best-effort) ─────────────────────────────────────────────
    ext = _ext_for(file.filename or "", file.content_type or "")
    storage_path = f"{user_id}/{uuid.uuid4()}.{ext}"
    stored = False
    try:
        supabase_client.storage.from_("resumes").upload(
            path=storage_path,
            file=data,
            file_options={"content-type": file.content_type or "application/octet-stream",
                          "upsert": "false"},
        )
        stored = True
    except Exception as e:
        print(f"[resume upload] storage upload failed: {type(e).__name__}: {e}", flush=True)

    try:
        supabase_client.table("resumes").insert({
            "user_id": user_id,
            "filename": file.filename or "resume",
            "storage_path": storage_path if stored else "",
            "content_type": file.content_type or "",
            "size_bytes": len(data),
            "extracted_topics": result.get("topics", []),
            "detected_years_experience": result.get("detected_years_experience", 0),
        }).execute()
    except Exception as e:
        print(f"[resume upload] resumes row insert failed: {type(e).__name__}: {e}", flush=True)

    return result


@router.get("/resume")
def get_latest_resume(user_id: str = Depends(verify_jwt)):
    """Return the learner's most recent stored resume (topics + metadata,
    NOT the raw file). Powers the "use previous resume" UX on return visits.
    Response: `{filename, uploaded_at, topics, detected_years_experience}` or
    `{resume: null}` if none exists yet."""
    r = (
        supabase_client.table("resumes")
        .select("filename, uploaded_at, extracted_topics, detected_years_experience")
        .eq("user_id", user_id)
        .order("uploaded_at", desc=True)
        .limit(1)
        .execute()
    )
    if not r.data:
        return {"resume": None}
    row = r.data[0]
    return {
        "resume": {
            "filename": row.get("filename"),
            "uploaded_at": row.get("uploaded_at"),
            "topics": row.get("extracted_topics") or [],
            "detected_years_experience": row.get("detected_years_experience") or 0,
        }
    }
