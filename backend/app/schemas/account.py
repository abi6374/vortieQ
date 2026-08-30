"""Strict schemas for account.py - previously every mutation route there
(update_me, update_settings, log_session) took a bare `dict` via
Body(...), with no type/length/range validation on any value (only
account_service's own EDITABLE_PROFILE/EDITABLE_SETTINGS whitelists
constrained which KEYS could be written, never what a value could BE).
All three are real, reachable, authenticated mutation endpoints.
"""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

# Matches account_service.EDITABLE_PROFILE exactly - every field optional
# since this is a PATCH (partial update); only fields the caller actually
# set are ever forwarded to the service (see the router's
# model_dump(exclude_none=True) call sites).
_MAX_INTERESTS = 30


class ProfileUpdateSchema(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    goal_text: str | None = Field(default=None, min_length=1, max_length=4000)
    target_role: str | None = Field(default=None, min_length=1, max_length=200)
    current_level: Literal["beginner", "intermediate", "advanced"] | None = None
    interests: list[str] | None = Field(default=None, max_length=_MAX_INTERESTS)
    weekly_hours: int | None = Field(default=None, ge=1, le=168)  # can't exceed hours in a week

    @field_validator("interests")
    @classmethod
    def _bound_each_interest(cls, v):
        if v is None:
            return v
        return [i.strip()[:100] for i in v if i and i.strip()]


# Matches account_service.DEFAULT_SETTINGS's keys and the real CHECK
# constraints already enforced at the DB level (migration 005:
# difficulty_preference IN ('easier','adaptive','harder')) - enforcing the
# same enum at the schema boundary turns a would-be DB constraint
# violation (an opaque 500/Postgres error) into a clean, documented 422.
class SettingsUpdateSchema(BaseModel):
    weekly_hours: int | None = Field(default=None, ge=1, le=168)
    target_date: date | None = None
    email_notifications: bool | None = None
    reminder_notifications: bool | None = None
    ai_suggestions: bool | None = None
    # Matches provider_resources.format's real values (migration 007/014)
    # plus 'practice_sheet', the one additional format
    # swap_step_with_preference's real preference vocabulary supports.
    preferred_formats: list[Literal["course", "video", "article", "interactive", "practice_sheet"]] | None = Field(
        default=None, max_length=10
    )
    difficulty_preference: Literal["easier", "adaptive", "harder"] | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)


# activity is deliberately a narrow Literal, not a free string: "manual"
# (the router's own pre-existing default) and "task_completed" (the only
# real value any server-side caller - roadmap_service.set_task_completion -
# ever sends) are the only two currently meaningful values. This endpoint
# is authenticated and reachable but not currently called by the frontend
# (task completion logs a session internally via the service function
# directly, not through this HTTP route) - hardened anyway since it's a
# real, live mutation surface regardless of current UI usage.
class StudySessionSchema(BaseModel):
    activity: Literal["manual", "task_completed"] = "manual"
    minutes: int = Field(default=0, ge=0, le=1440)  # a full day, generously capped
    step_id: str | None = Field(default=None, max_length=100)
