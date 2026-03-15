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
    tools: list[str] | None = None
    mcp_servers: list[str] | None = None

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class AgentConfigDetail(AgentConfigResponse):
    system_prompt: str
    fallback_agents: list[str]
    model_config_json: dict


class CreateSessionRequest(BaseModel):
    agent_name: str
    mode: str = "ask"
    source: str = "playground"


class SessionResponse(BaseModel):
    id: str
    agent_name: str
    title: str
    mode: str = "ask"
    source: str = "playground"
    native_session_id: str | None = None
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
    type: str  # text | code | error | done
    content: str = ""
    session_id: str = ""
