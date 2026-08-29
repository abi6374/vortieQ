import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.config import supabase_client
from app.middleware.auth import verify_jwt
from app.middleware.rate_limit import rate_limit
from app.schemas.profile import ProfileCreateSchema, ResumeExtractResponse
from app.services import profile_service, resume_service

router = APIRouter()


@router.post("/")
def create_or_update_profile(
    payload: ProfileCreateSchema,
    user_id: str = Depends(rate_limit("profile.create", max_calls=10)),
):
    # Fold real resume context (education/projects) into what the LLM sees
    # when inferring target_role/current_level/interests - previously this
    # context was extracted and shown in the "AI Profile Draft" but had
    # nowhere to go, so it never actually influenced the profile driving
    # recommendations. goal_text itself (what's persisted/displayed) stays
    # exactly what the user typed - only the extraction call gets the extra
    # context appended.
    extraction_input = payload.goal_text
    if payload.resume_education:
        extraction_input += f"\n\nEducation background: {payload.resume_education}"
    if payload.resume_projects:
        extraction_input += f"\n\nNotable projects: {payload.resume_projects}"

    extracted = profile_service.extract_profile(extraction_input)
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

    # Explicit role selection (custom role text, or a fixed preset) is a
    # direct, authoritative user signal - it wins over whatever the LLM
    # separately inferred from goal_text, rather than relying on the LLM to
    # correctly re-parse a role the user already told the UI directly.
    if payload.target_role_override and payload.target_role_override.strip():
        extracted["target_role"] = payload.target_role_override.strip()

    return profile_service.upsert_profile(user_id, extracted)


# ── Resume: upload + persist ─────────────────────────────────────────────────
# Storage layout: `resumes` bucket, object key = "{user_id}/{uuid}.{ext}".
# RLS on storage.objects (from the earlier migration) constrains the anon
# client to this prefix; the service role we use here bypasses RLS, so this
# code just has to write into the correct prefix to keep the model consistent.


# migration 003_resume_context.sql adds education/projects/suggested_goal to
# `resumes`. Cached, lazy check so this degrades gracefully (those 3 fields
# just don't get persisted/reused) instead of hard-failing resume upload if
# that migration hasn't been run against this DB yet.
_resume_context_schema_checked = None


def _has_resume_context_schema() -> bool:
    global _resume_context_schema_checked
    if _resume_context_schema_checked is None:
        try:
            supabase_client.table("resumes").select("education").limit(1).execute()
            _resume_context_schema_checked = True
        except Exception:
            _resume_context_schema_checked = False
    return _resume_context_schema_checked


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
    user_id: str = Depends(rate_limit("profile.resume", max_calls=10)),
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
        row = {
            "user_id": user_id,
            "filename": file.filename or "resume",
            "storage_path": storage_path if stored else "",
            "content_type": file.content_type or "",
            "size_bytes": len(data),
            "extracted_topics": result.get("topics", []),
            "detected_years_experience": result.get("detected_years_experience", 0),
        }
        if _has_resume_context_schema():
            row["education"] = result.get("education", "")
            row["projects"] = result.get("projects", "")
            row["suggested_goal"] = result.get("suggested_goal", "")
        supabase_client.table("resumes").insert(row).execute()
    except Exception as e:
        print(f"[resume upload] resumes row insert failed: {type(e).__name__}: {e}", flush=True)

    return result


@router.get("/resume")
def get_latest_resume(user_id: str = Depends(verify_jwt)):
    """Return the learner's most recent stored resume (topics + metadata,
    NOT the raw file). Powers the "use previous resume" UX on return visits.
    Response: `{filename, uploaded_at, topics, detected_years_experience}` or
    `{resume: null}` if none exists yet."""
    fields = "filename, uploaded_at, extracted_topics, detected_years_experience"
    if _has_resume_context_schema():
        fields += ", education, projects, suggested_goal"
    r = (
        supabase_client.table("resumes")
        .select(fields)
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
            "education": row.get("education") or "",
            "projects": row.get("projects") or "",
            "suggested_goal": row.get("suggested_goal") or "",
        }
    }
