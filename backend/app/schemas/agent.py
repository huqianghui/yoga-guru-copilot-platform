from datetime import datetime
from pydantic import BaseModel


class AgentConfigResponse(BaseModel):
    id: str
    name: str
    display_name: str
    icon: str
    description: str
    available: bool
    skills: list[str]
    preferred_agent: str
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class AgentConfigDetail(AgentConfigResponse):
    system_prompt: str
    fallback_agents: list[str]
    model_config_json: dict


class CreateSessionRequest(BaseModel):
    agent_name: str


class SessionResponse(BaseModel):
    id: str
    agent_name: str
    title: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentEventResponse(BaseModel):
    type: str  # text | error | done
    content: str = ""
    session_id: str = ""
