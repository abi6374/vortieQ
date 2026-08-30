from pydantic import BaseModel, Field


class TopicRating(BaseModel):
    """A single technical topic the learner claims a level for.

    `level` uses the 4-tier scale that resume extraction and assessment share;
    it is mapped to the recommender's 3-tier scale (beginner/intermediate/
    advanced) inside profile_service when we push into the DB.
    """
    # Length-capped: this name is passed to taxonomy_service.
    # resolve_or_create_skill(), which - if nothing matches an existing
    # alias - INSERTS it as a new permanent row in the SHARED skills
    # taxonomy table (visible to every learner, e.g. in quick-add
    # suggestions). Previously unbounded, so a garbage/oversized/malicious
    # "skill name" from any self-assessment submission could permanently
    # pollute shared reference data. 80 chars is generous for any real
    # skill/technology name.
    name: str = Field(..., min_length=1, max_length=80)
    level: str = Field(..., description='one of "basic" | "intermediate" | "advanced" | "expert"')
    evidence: str = Field(default="", max_length=500)
    confidence_pct: int | None = Field(default=None, ge=0, le=100)  # None = no real evidence-backed confidence


class ProfileCreateSchema(BaseModel):
    # Length caps bound both the LLM's prompt-injection surface (these three
    # fields are concatenated into one message sent to the model - see
    # routers/profile.py) and the token cost of a single request. 4000 chars
    # is generous for a genuine free-text goal/education/project description
    # while still ruling out a multi-megabyte payload used to pad cost or
    # attempt to bury an injection attempt in bulk text.
    goal_text: str = Field(..., max_length=4000)
    topic_ratings: list[TopicRating] | None = None  # optional; comes from resume flow
    detected_years_experience: int | None = None
    # Real resume context (education/projects) beyond just skills - folded
    # into the profile-extraction LLM call as extra grounding so the "AI
    # Profile Draft" the learner sees is actually reflected in the profile
    # that drives recommendations, not just displayed and discarded.
    resume_education: str | None = Field(default=None, max_length=4000)
    resume_projects: str | None = Field(default=None, max_length=4000)
    # Explicit role selection from GoalCompass (custom role text, or one of
    # the fixed presets) - an authoritative user signal that should win over
    # whatever the LLM might separately infer from goal_text, not just get
    # folded into a sentence and hope the LLM parses it back out correctly.
    target_role_override: str | None = Field(default=None, max_length=200)


class ProfileSchema(BaseModel):
    id: str
    user_id: str
    goal_text: str
    target_role: str
    current_level: str
    interests: list[str]
    weekly_hours: int


class ResumeExtractedTopic(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    evidence: str = Field(default="", max_length=500)
    suggested_level: str  # basic|intermediate|advanced|expert
    # None = the LLM did not produce a real, in-range confidence for this
    # topic - resume_service._confidence_pct_or_none() already normalizes
    # to None rather than inventing one; this schema must not silently
    # replace that honest "unknown" with a fabricated default (it
    # previously defaulted to 80, which is exactly the kind of "confidence
    # without real evidence" the platform audit targets - a response with
    # a missing confidence_pct would have been serialized by FastAPI's
    # response_model as if the LLM had actually said 80%).
    confidence_pct: int | None = Field(default=None, ge=0, le=100)


class ResumeExtractResponse(BaseModel):
    topics: list[ResumeExtractedTopic]
    detected_years_experience: int
    education: str = ""
    projects: str = ""
    suggested_goal: str = ""


class TextExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)

