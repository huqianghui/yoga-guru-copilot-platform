"""Anthropic Claude adapter for agent system."""
import logging
from typing import AsyncIterator

from anthropic import AsyncAnthropic

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent

logger = logging.getLogger(__name__)


class AnthropicClaudeAdapter(BaseAgentAdapter):
    """Adapter for Anthropic Claude API."""

    name = "anthropic-claude"

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.anthropic_api_key)

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        try:
            messages = []
            system_parts = []
            for msg in request.history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "system":
                    system_parts.append(content)
                else:
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": request.prompt})
            system_prompt = "\n\n".join(system_parts)

            async with AsyncAnthropic(api_key=settings.anthropic_api_key) as client:
                async with client.messages.stream(
                    model=settings.anthropic_model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield AgentEvent(type="text", content=text)

            yield AgentEvent(type="done", content="")

        except Exception as e:
            logger.error(f"Anthropic Claude error: {e}")
            yield AgentEvent(type="error", content=f"Claude API 错误: {str(e)[:200]}")
