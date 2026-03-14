from app.services.agents.base import BaseAgentAdapter


class AgentRegistry:
    _instance = None
    _adapters: dict[str, BaseAgentAdapter] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._adapters = {}
        return cls._instance

    def register(self, adapter: BaseAgentAdapter) -> None:
        self._adapters[adapter.name] = adapter

    def get(self, name: str) -> BaseAgentAdapter | None:
        return self._adapters.get(name)

    def list_available(self) -> list[str]:
        return list(self._adapters.keys())

    async def check_availability(self, name: str) -> bool:
        adapter = self.get(name)
        if not adapter:
            return False
        return await adapter.is_available()


registry = AgentRegistry()
