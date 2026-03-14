from app.services.agents.registry import registry
from app.services.agents.adapters.azure_openai import AzureOpenAIAdapter
from app.services.agents.adapters.anthropic_claude import AnthropicClaudeAdapter
from app.services.agents.adapters.openai_native import OpenAINativeAdapter
from app.services.agents.adapters.mock import MockAgentAdapter


def register_all_adapters():
    """Register all available agent adapters."""
    registry.register(AzureOpenAIAdapter())
    registry.register(AnthropicClaudeAdapter())
    registry.register(OpenAINativeAdapter())
    registry.register(MockAgentAdapter())
