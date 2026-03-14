from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator


class AgentMode(str, Enum):
    CHAT = "chat"
    PLAN = "plan"


@dataclass
class AgentContext:
    module: str = ""           # e.g., "course-planning", "video-analysis"
    page_data: dict = field(default_factory=dict)
    user_id: str = ""


@dataclass
class AgentRequest:
    prompt: str
    session_id: str = ""
    agent_name: str = ""
    mode: AgentMode = AgentMode.CHAT
    context: AgentContext = field(default_factory=AgentContext)
    history: list[dict] = field(default_factory=list)


@dataclass
class AgentEvent:
    type: str       # "text", "error", "done"
    content: str = ""


class BaseAgentAdapter(ABC):
    name: str = ""

    @abstractmethod
    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """Stream agent events for the given request."""
        yield AgentEvent(type="error", content="Not implemented")

    async def is_available(self) -> bool:
        """Check if this agent adapter is currently available."""
        return True
