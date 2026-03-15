import pytest
from sqlalchemy import select

from tests.conftest import TestSession
from app.models.user import User


async def register_and_login(client, username="askill_admin", email="askill_admin@test.com"):
    """Register a user and return their auth token."""
    await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": "test1234",
        "display_name": "Agent Skill Admin",
    })
    resp = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test1234",
    })
    return resp.json()["access_token"]


async def make_admin(username="askill_admin"):
    """Promote a user to admin role directly in the test DB."""
    async with TestSession() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one()
        user.role = "admin"
        await session.commit()


async def get_admin_headers(client, username="askill_admin", email="askill_admin@test.com"):
    """Register, promote to admin, login, and return auth headers."""
    token = await register_and_login(client, username, email)
    await make_admin(username)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_agent_skill_assignment(client):
    """Agent-Skill assignment API works end-to-end."""
    headers = await get_admin_headers(client)

    # Create a test agent config first (no seeded data in test DB)
    await client.post("/api/agents/configs", headers=headers, json={
        "name": "test-agent-for-skills",
        "display_name": "Test Agent",
        "preferred_agent": "mock",
    })

    # Create a test skill
    skill_resp = await client.post("/api/skills", json={
        "name": "test-assign-skill",
        "display_name": "Assign Test Skill",
        "skill_type": "managed",
        "content": "Test",
    }, headers=headers)
    assert skill_resp.status_code == 201
    skill_id = skill_resp.json()["id"]

    # Assign skill to agent
    resp = await client.post(
        "/api/agents/test-agent-for-skills/skills",
        json={"skill_id": skill_id},
        headers=headers,
    )
    assert resp.status_code == 201

    # List agent's skills
    resp = await client.get(
        "/api/agents/test-agent-for-skills/skills",
        headers=headers,
    )
    assert resp.status_code == 200
    assigned = resp.json()
    assert any(s["id"] == skill_id for s in assigned)

    # Remove skill from agent
    resp = await client.delete(
        f"/api/agents/test-agent-for-skills/skills/{skill_id}",
        headers=headers,
    )
    assert resp.status_code == 204

    # Verify removed
    resp = await client.get(
        "/api/agents/test-agent-for-skills/skills",
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 0
