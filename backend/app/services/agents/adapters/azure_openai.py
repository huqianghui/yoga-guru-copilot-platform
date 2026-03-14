from typing import AsyncIterator
from openai import AsyncAzureOpenAI

from app.config import get_settings
from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent


class AzureOpenAIAdapter(BaseAgentAdapter):
    name = "azure-openai"

    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        settings = get_settings()
        client = AsyncAzureOpenAI(
            azure_endpoint=settings.azure_openai_endpoint,
            api_key=settings.azure_openai_key,
            api_version=settings.azure_openai_api_version,
        )

        messages = []
        for msg in request.history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": request.prompt})

        try:
            stream = await client.chat.completions.create(
                model=settings.azure_openai_deployment,
                messages=messages,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield AgentEvent(type="text", content=chunk.choices[0].delta.content)
            yield AgentEvent(type="done")
        except Exception as e:
            yield AgentEvent(type="error", content=str(e))

    async def is_available(self) -> bool:
        settings = get_settings()
        return bool(settings.azure_openai_endpoint and settings.azure_openai_key)
