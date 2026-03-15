from datetime import datetime
from pydantic import BaseModel


class AgentConfigAdminResponse(BaseModel):
    """Full admin response with all fields + timestamps."""

    model_config = {"from_attributes": True, "protected_namespaces": ()}

    id: str
    name: str
    display_name: str
    icon: str
    description: str
    system_prompt: str
    skills: list[str]
    preferred_agent: str
    fallback_agents: list[str]
    available: bool
    model_config_json: dict
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None
    created_at: datetime
    updated_at: datetime


class AgentConfigCreate(BaseModel):
    """Schema for creating a new agent configuration."""

    model_config = {"protected_namespaces": ()}

    name: str
    display_name: str
    icon: str = "\U0001f916"
    description: str = ""
    system_prompt: str = ""
    skills: list[str] = []
    preferred_agent: str = "azure-openai"
    fallback_agents: list[str] = ["mock"]
    available: bool = True
    model_config_json: dict = {}
    agent_type: str = "copilot"
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None


class AgentConfigUpdate(BaseModel):
    """Schema for partial updates to an agent configuration."""

    model_config = {"protected_namespaces": ()}

    display_name: str | None = None
    icon: str | None = None
    description: str | None = None
    system_prompt: str | None = None
    skills: list[str] | None = None
    preferred_agent: str | None = None
    fallback_agents: list[str] | None = None
    available: bool | None = None
    model_config_json: dict | None = None
    agent_type: str | None = None
    modes: list[str] | None = None
    version: str | None = None
    provider: str | None = None
    model_name: str | None = None
    install_hint: str | None = None
    tools: list | None = None
    mcp_servers: list | None = None


class AdapterInfo(BaseModel):
    """Info about a registered AI adapter."""

    name: str
    available: bool
