import pytest
from sqlalchemy import select

from tests.conftest import TestSession
from app.models.user import User


async def register_and_login(client, username="agent_admin", email="agent_admin@test.com"):
    """Register a user and return their auth token."""
    await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": "test1234",
        "display_name": "Agent Admin",
    })
    resp = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test1234",
    })
    return resp.json()["access_token"]


async def make_admin(username="agent_admin"):
    """Promote a user to admin role directly in the test DB."""
    async with TestSession() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one()
        user.role = "admin"
        await session.commit()


async def get_admin_headers(client, username="agent_admin", email="agent_admin@test.com"):
    """Register, promote to admin, login, and return auth headers."""
    token = await register_and_login(client, username, email)
    await make_admin(username)
    return {"Authorization": f"Bearer {token}"}


# --- Adapter listing ---


@pytest.mark.asyncio
async def test_list_adapters(client):
    """Admin can list all registered adapters."""
    # Ensure at least a test adapter is registered (lifespan doesn't fire in test transport)
    from app.services.agents.registry import registry
    from app.services.agents.base import BaseAgentAdapter, AgentRequest, AgentEvent
    from typing import AsyncIterator

    class _TestAdapter(BaseAgentAdapter):
        name = "test-adapter"

        async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
            yield AgentEvent(type="done", content="test")

    if not registry.get("test-adapter"):
        registry.register(_TestAdapter())

    headers = await get_admin_headers(client)
    resp = await client.get("/api/agents/adapters", headers=headers)
    assert resp.status_code == 200
    adapters = resp.json()
    assert isinstance(adapters, list)
    names = [a["name"] for a in adapters]
    # test adapter was registered above
    assert "test-adapter" in names
    # Each adapter has name and available fields
    for adapter in adapters:
        assert "name" in adapter
        assert "available" in adapter
        assert isinstance(adapter["available"], bool)


@pytest.mark.asyncio
async def test_list_adapters_requires_admin(client):
    """Non-admin user cannot list adapters."""
    token = await register_and_login(client, "normal_user", "normal@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.get("/api/agents/adapters", headers=headers)
    assert resp.status_code == 403


# --- Create agent config ---


@pytest.mark.asyncio
async def test_create_agent_config(client):
    """Admin can create a new agent config."""
    headers = await get_admin_headers(client)
    resp = await client.post("/api/agents/configs", headers=headers, json={
        "name": "test-agent",
        "display_name": "Test Agent",
        "description": "A test agent",
        "system_prompt": "You are a test assistant.",
        "preferred_agent": "mock",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "test-agent"
    assert data["display_name"] == "Test Agent"
    assert data["description"] == "A test agent"
    assert data["system_prompt"] == "You are a test assistant."
    assert data["preferred_agent"] == "mock"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


@pytest.mark.asyncio
async def test_create_duplicate_name(client):
    """Creating an agent with a duplicate name returns 409."""
    headers = await get_admin_headers(client)
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "dup-agent",
        "display_name": "First",
        "preferred_agent": "mock",
    })
    resp = await client.post("/api/agents/configs", headers=headers, json={
        "name": "dup-agent",
        "display_name": "Second",
        "preferred_agent": "mock",
    })
    assert resp.status_code == 409


# --- Update agent config ---


@pytest.mark.asyncio
async def test_update_agent_config(client):
    """Admin can partially update an existing agent config."""
    headers = await get_admin_headers(client)
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "update-agent",
        "display_name": "Before Update",
        "preferred_agent": "mock",
    })
    resp = await client.patch("/api/agents/configs/update-agent", headers=headers, json={
        "display_name": "After Update",
        "system_prompt": "New system prompt",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "After Update"
    assert data["system_prompt"] == "New system prompt"
    # Unchanged fields should remain
    assert data["name"] == "update-agent"
    assert data["preferred_agent"] == "mock"


@pytest.mark.asyncio
async def test_update_nonexistent_agent(client):
    """Updating a non-existent agent returns 404."""
    headers = await get_admin_headers(client)
    resp = await client.patch("/api/agents/configs/nonexistent", headers=headers, json={
        "display_name": "No such agent",
    })
    assert resp.status_code == 404


# --- Delete agent config ---


@pytest.mark.asyncio
async def test_delete_agent_config(client):
    """Admin can delete an agent config."""
    headers = await get_admin_headers(client)
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "delete-agent",
        "display_name": "To Delete",
        "preferred_agent": "mock",
    })
    resp = await client.delete("/api/agents/configs/delete-agent", headers=headers)
    assert resp.status_code == 204

    # Verify it's gone by trying to update it
    resp = await client.patch("/api/agents/configs/delete-agent", headers=headers, json={
        "display_name": "Should not work",
    })
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent_agent(client):
    """Deleting a non-existent agent returns 404."""
    headers = await get_admin_headers(client)
    resp = await client.delete("/api/agents/configs/nonexistent", headers=headers)
    assert resp.status_code == 404


# --- Authorization checks ---


@pytest.mark.asyncio
async def test_create_requires_admin(client):
    """Non-admin user cannot create agent configs."""
    token = await register_and_login(client, "normal_user2", "normal2@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post("/api/agents/configs", headers=headers, json={
        "name": "unauthorized-agent",
        "display_name": "Should Fail",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_no_auth_returns_403(client):
    """Requests without auth token return 403."""
    resp = await client.get("/api/agents/adapters")
    assert resp.status_code == 403
