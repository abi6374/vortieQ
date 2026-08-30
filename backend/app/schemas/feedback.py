from typing import Literal

from pydantic import BaseModel, Field


class FeedbackCreateSchema(BaseModel):
    # Matches the DB's own CHECK constraint exactly (data/migrations/
    # 011_realtime_feedback_events.sql: event_type TEXT CHECK (event_type IN
    # ('completed','too_easy','too_hard','not_interested'))) and
    # feedback_service.handle_feedback's manual validation - previously
    # event_type was a bare `str`, so an invalid value only got caught
    # downstream in the service layer (still a 400, but only after Pydantic
    # already accepted anything). A Literal here rejects it at the schema
    # boundary with a self-documenting 422 instead.
    # 'too_hard' is the symmetric opposite of 'too_easy': a real signal the
    # recommender OVERESTIMATED this skill, not merely "I disliked this" -
    # see mastery_service.update_mastery_from_feedback.
    event_type: Literal["completed", "too_easy", "too_hard", "not_interested"]
    note: str = Field(default="", max_length=1000)
