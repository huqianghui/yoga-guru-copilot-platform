"""OpenAI native (non-Azure) adapter for agent system."""
import logging
from typing import AsyncIterator

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent

logger = logging.getLogger(__name__)


class OpenAINativeAdapter(BaseAgentAdapter):
    """Adapter for OpenAI API directly (GPT-4o / o1)."""

    name = "openai"

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.openai_api_key)

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        try:
            messages = []
            for msg in request.history:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })
            messages.append({"role": "user", "content": request.prompt})

            async with AsyncOpenAI(api_key=settings.openai_api_key) as client:
                stream = await client.chat.completions.create(
                    model=settings.openai_model,
                    messages=messages,
                    stream=True,
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield AgentEvent(type="text", content=chunk.choices[0].delta.content)

            yield AgentEvent(type="done", content="")

        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            yield AgentEvent(type="error", content=f"OpenAI API 错误: {str(e)[:200]}")
