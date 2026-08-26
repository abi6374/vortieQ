from pydantic import BaseModel


class CourseSchema(BaseModel):
    id: str
    title: str
    description: str
    provider: str
    skill_tags: list[str]
    difficulty: str
    duration_hrs: int
    prerequisites: list[str]
    resource_url: str
    similarity: float = 0.0
