from pydantic import BaseModel


class StepSchema(BaseModel):
    step_id: str
    course_id: str
    title: str
    provider: str
    duration_hrs: int
    difficulty: str
    explanation: str
    status: str


class MilestoneSchema(BaseModel):
    label: str
    sequence_order: int
    steps: list[StepSchema]


class PathSchema(BaseModel):
    path_id: str
    milestones: list[MilestoneSchema]
