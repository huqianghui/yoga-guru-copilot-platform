import pytest
from sqlalchemy import select

from tests.conftest import TestSession
from app.models.user import User
from app.models.agent_config import AgentConfig
from app.models.skill import Skill
from app.services.startup import _seed_system_agents, _seed_default_skills


async def register_and_login(client, username="seed_admin", email="seed_admin@test.com"):
    await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": "test1234",
        "display_name": "Seed Admin",
    })
    resp = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test1234",
    })
    return resp.json()["access_token"]


async def make_admin(username="seed_admin"):
    async with TestSession() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one()
        user.role = "admin"
        await session.commit()


async def get_admin_headers(client, username="seed_admin", email="seed_admin@test.com"):
    token = await register_and_login(client, username, email)
    await make_admin(username)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_system_agents_seeded(client):
    """System agents are seeded correctly."""
    # Manually seed system agents (lifespan doesn't fire in test transport)
    async with TestSession() as db:
        await _seed_system_agents(db)
        await db.commit()

    headers = await get_admin_headers(client)
    resp = await client.get("/api/agents/", headers=headers)
    agents = resp.json()

    system_agents = [a for a in agents if a.get("agent_type") == "system"]
    assert len(system_agents) >= 3

    names = [a["name"] for a in system_agents]
    assert "claude-code" in names
    assert "codex-cli" in names
    assert "github-copilot" in names
    assert "opencode" in names


@pytest.mark.asyncio
async def test_default_skills_seeded(client):
    """Default skills are seeded correctly."""
    async with TestSession() as db:
        await _seed_default_skills(db)
        await db.commit()

    headers = await get_admin_headers(client)
    resp = await client.get("/api/skills", headers=headers)
    skills = resp.json()
    assert len(skills) >= 5

    names = [s["name"] for s in skills]
    assert "yoga-sequence-generator" in names
    assert "code-review" in names
    assert "caption-writer" in names


@pytest.mark.asyncio
async def test_seed_idempotent(client):
    """Running seed twice doesn't duplicate data."""
    async with TestSession() as db:
        await _seed_system_agents(db)
        await _seed_default_skills(db)
        await db.commit()

    async with TestSession() as db:
        await _seed_system_agents(db)
        await _seed_default_skills(db)
        await db.commit()

    async with TestSession() as db:
        result = await db.execute(
            select(AgentConfig).where(AgentConfig.agent_type == "system")
        )
        agents = list(result.scalars().all())
        assert len(agents) == 4  # exactly 4 system agents

        result = await db.execute(select(Skill))
        skills = list(result.scalars().all())
        assert len(skills) == 8  # exactly 8 default skills
