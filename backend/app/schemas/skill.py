from datetime import datetime
from pydantic import BaseModel


class SkillCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    skill_type: str = "managed"
    category: str | None = None
    content: str = ""
    input_schema: dict | None = None
    available: bool = True


class SkillUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None
    skill_type: str | None = None
    category: str | None = None
    content: str | None = None
    input_schema: dict | None = None
    available: bool | None = None


class SkillResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: str
    skill_type: str
    category: str | None
    content: str
    input_schema: dict | None
    available: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SkillBriefResponse(BaseModel):
    """Lightweight response for list views."""

    id: str
    name: str
    display_name: str
    description: str
    skill_type: str
    category: str | None
    available: bool

    model_config = {"from_attributes": True}


class SkillAssignRequest(BaseModel):
    skill_id: str
