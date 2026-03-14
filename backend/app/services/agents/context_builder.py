from app.services.agents.base import AgentContext


def build_context_prompt(system_prompt: str, context: AgentContext) -> str:
    """Inject yoga module context into the system prompt."""
    parts = [system_prompt]

    if context.module:
        parts.append(f"\n\n---\n当前模块: {context.module}")

    if context.page_data:
        parts.append("当前页面数据:")
        for key, value in context.page_data.items():
            parts.append(f"- {key}: {value}")

    return "\n".join(parts)
