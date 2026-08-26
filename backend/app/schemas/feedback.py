from pydantic import BaseModel


class FeedbackCreateSchema(BaseModel):
    event_type: str  # "completed" | "too_easy" | "not_interested"
    note: str = ""
