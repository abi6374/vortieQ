from typing import Literal

from pydantic import BaseModel, Field


class TaskCompletionSchema(BaseModel):
    """Body for PATCH /api/roadmap/tasks/{step_id}.

    completed is a real bool field (not a raw dict value passed through
    Python's bool()) - a real production bug this fixes: bool("false") is
    True in Python (any non-empty string is truthy), so a client sending
    {"completed": "false"} would have been recorded as completing the task.
    Pydantic's bool parsing does real semantic parsing instead: "false"/
    "False"/"0"/"no"/"off" all correctly become False, and anything that
    isn't a recognizable boolean (not just falsy) is rejected with a 422
    rather than silently coerced.
    """
    completed: bool
    note: str = Field(default="", max_length=1000)
    rating: int | None = Field(default=None, ge=1, le=5)
    tag: str = Field(default="", max_length=50)


class RerecommendSchema(BaseModel):
    """Body for POST /api/roadmap/rerecommend.

    preference is a real enum, not a bare string - matches the exact 5
    option ids the live UI sends (PersonalizedRoadmap.jsx's
    RERECOMMEND_OPTIONS). Previously any string was accepted; an
    unrecognized value silently fell through path_service.
    swap_step_with_preference's if/elif chain to the generic "custom-like"
    branch rather than being rejected, and could still be persisted verbatim
    into feedback_events.note. 'too_advanced'/'too_basic' are the only two
    that move mastery evidence (see path_service.swap_step_with_preference) -
    constraining the type here is what makes that mapping exhaustive and
    typo-proof rather than a string comparison that silently does nothing
    on a mismatch.
    """
    step_id: str
    preference: Literal["free_resource", "hands_on", "too_advanced", "too_basic", "custom"] = "custom"
    note: str = Field(default="", max_length=1000)
