from pydantic import BaseModel, Field


class TopicRating(BaseModel):
    """A single technical topic the learner claims a level for.

    `level` uses the 4-tier scale that resume extraction and assessment share;
    it is mapped to the recommender's 3-tier scale (beginner/intermediate/
    advanced) inside profile_service when we push into the DB.
    """
    name: str
    level: str = Field(..., description='one of "basic" | "intermediate" | "advanced" | "expert"')
    evidence: str = ""
    confidence_pct: int | None = None  # populated later when Phase 6 lands


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
    name: str
    evidence: str
    suggested_level: str  # basic|intermediate|advanced|expert
    confidence_pct: int = 80


class ResumeExtractResponse(BaseModel):
    topics: list[ResumeExtractedTopic]
    detected_years_experience: int
    education: str = ""
    projects: str = ""
    suggested_goal: str = ""
