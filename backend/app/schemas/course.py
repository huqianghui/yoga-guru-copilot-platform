from datetime import datetime
from pydantic import BaseModel


class PoseInput(BaseModel):
    name: str
    duration: str
    notes: str = ""


class CreateCourseRequest(BaseModel):
    title: str
    theme: str = ""
    duration: str
    level: str
    style: str
    focus: str = ""
    poses: list[PoseInput] = []


class UpdateCourseRequest(BaseModel):
    title: str | None = None
    theme: str | None = None
    duration: str | None = None
    level: str | None = None
    style: str | None = None
    focus: str | None = None


class PoseResponse(BaseModel):
    id: str
    name: str
    duration: str
    notes: str
    order_index: int

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: str
    title: str
    theme: str
    duration: str
    level: str
    style: str
    focus: str
    created_at: datetime
    poses: list[PoseResponse] = []

    model_config = {"from_attributes": True}


class GenerateCourseRequest(BaseModel):
    theme: str
    duration: str
    level: str
    style: str
    focus: str = ""
