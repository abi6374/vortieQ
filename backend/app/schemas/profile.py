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
    goal_text: str
    topic_ratings: list[TopicRating] | None = None  # optional; comes from resume flow
    detected_years_experience: int | None = None


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


class ResumeExtractResponse(BaseModel):
    topics: list[ResumeExtractedTopic]
    detected_years_experience: int
