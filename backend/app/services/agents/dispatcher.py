from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent_config import AgentConfig
from app.services.agents.base import AgentRequest, AgentEvent
from app.services.agents.registry import registry
from app.services.agents.context_builder import build_context_prompt


class NoAgentAvailableError(Exception):
    pass


async def dispatch(
    db: AsyncSession,
    agent_name: str,
    request: AgentRequest,
) -> AsyncIterator[AgentEvent]:
    """Dispatch request to the best available agent adapter with failover."""
    # Load copilot config
    result = await db.execute(select(AgentConfig).where(AgentConfig.name == agent_name))
    config = result.scalar_one_or_none()
    if not config:
        yield AgentEvent(type="error", content=f"Copilot '{agent_name}' not found")
        return

    # Build full prompt with context
    full_system_prompt = build_context_prompt(config.system_prompt, request.context)

    # Try preferred agent, then fallbacks
    agents_to_try = [config.preferred_agent] + (config.fallback_agents or [])

    for adapter_name in agents_to_try:
        adapter = registry.get(adapter_name)
        if adapter and await adapter.is_available():
            # Inject system prompt into request history
            request.history = [
                {"role": "system", "content": full_system_prompt},
                *request.history,
            ]
            async for event in adapter.execute(request):
                yield event
            return

    yield AgentEvent(type="error", content="所有 Agent 均不可用，请稍后重试")
