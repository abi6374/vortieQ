from pydantic import BaseModel


class ProfileCreateSchema(BaseModel):
    goal_text: str


class ProfileSchema(BaseModel):
    id: str
    user_id: str
    goal_text: str
    target_role: str
    current_level: str
    interests: list[str]
    weekly_hours: int
