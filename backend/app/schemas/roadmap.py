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
    """Body for POST /api/roadmap/rerecommend."""
    step_id: str
    preference: str = Field(default="custom", max_length=50)
    note: str = Field(default="", max_length=1000)
