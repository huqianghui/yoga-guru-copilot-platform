import asyncio
from typing import AsyncIterator

from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent


class MockAgentAdapter(BaseAgentAdapter):
    name = "mock"

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """Simulate a streaming response for development."""
        response = f"[Mock Copilot] 收到您的消息: \"{request.prompt}\"\n\n"
        response += "这是一个模拟回复。在配置好 Azure OpenAI 后，将使用真实的 AI 回复。\n\n"
        response += "当前上下文:\n"
        if request.context.module:
            response += f"- 模块: {request.context.module}\n"

        # Stream character by character with delay
        for char in response:
            yield AgentEvent(type="text", content=char)
            await asyncio.sleep(0.02)
        yield AgentEvent(type="done")

    async def is_available(self) -> bool:
        return True  # Always available
