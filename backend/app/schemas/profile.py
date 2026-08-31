from pydantic import BaseModel, Field


class TopicRating(BaseModel):
    """A single technical topic the learner claims a level for.

    `level` uses the 4-tier scale that resume extraction and assessment share;
    it is mapped to the recommender's 3-tier scale (beginner/intermediate/
    advanced) inside profile_service when we push into the DB.
    """
    name: str = Field(..., min_length=1, max_length=120)
    level: str | None = Field(default=None, description='one of "basic" | "intermediate" | "advanced" | "expert"')
    suggested_level: str | None = None
    evidence: str = Field(default="", max_length=1000)
    confidence_pct: int | float | None = Field(default=None, ge=0, le=100)  # None = no real evidence-backed confidence


class ProfileCreateSchema(BaseModel):
    goal_text: str = Field(..., max_length=4000)
    topic_ratings: list[TopicRating] | None = None  # optional; comes from resume flow
    detected_years_experience: int | None = None
    resume_education: str | None = Field(default=None, max_length=4000)
    resume_projects: str | None = Field(default=None, max_length=4000)
    target_role_override: str | None = Field(default=None, max_length=200)
    weekly_hours: int | None = None
    target_weeks: int | None = None


class ProfileSchema(BaseModel):
    id: str
    user_id: str
    goal_text: str
    target_role: str
    current_level: str
    interests: list[str]
    weekly_hours: int


class ResumeExtractedTopic(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    evidence: str = Field(default="", max_length=1000)
    suggested_level: str = "intermediate"  # basic|intermediate|advanced|expert
    confidence_pct: int | float | None = Field(default=None, ge=0, le=100)


class ResumeExtractResponse(BaseModel):
    topics: list[ResumeExtractedTopic]
    detected_years_experience: int = 0
    education: str = ""
    projects: str = ""
    suggested_goal: str = ""


class TextExtractRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)
