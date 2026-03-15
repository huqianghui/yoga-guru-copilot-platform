import pytest
from sqlalchemy import select

from tests.conftest import TestSession
from app.models.user import User


async def register_and_login(client, username="skill_admin", email="skill_admin@test.com"):
    """Register a user and return their auth token."""
    await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": "test1234",
        "display_name": "Skill Admin",
    })
    resp = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test1234",
    })
    return resp.json()["access_token"]


async def make_admin(username="skill_admin"):
    """Promote a user to admin role directly in the test DB."""
    async with TestSession() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one()
        user.role = "admin"
        await session.commit()


async def get_admin_headers(client, username="skill_admin", email="skill_admin@test.com"):
    """Register, promote to admin, login, and return auth headers."""
    token = await register_and_login(client, username, email)
    await make_admin(username)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_skills_crud_api(client):
    """Skills REST API supports full CRUD."""
    headers = await get_admin_headers(client)

    # Create
    resp = await client.post("/api/skills", json={
        "name": "test-api-skill",
        "display_name": "Test API Skill",
        "description": "Created via API test",
        "skill_type": "managed",
        "content": "Test skill content",
    }, headers=headers)
    assert resp.status_code == 201, resp.text
    skill = resp.json()
    skill_id = skill["id"]
    assert skill["name"] == "test-api-skill"

    # List
    resp = await client.get("/api/skills", headers=headers)
    assert resp.status_code == 200
    skills = resp.json()
    assert any(s["name"] == "test-api-skill" for s in skills)

    # Get
    resp = await client.get(f"/api/skills/{skill_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "test-api-skill"

    # Update
    resp = await client.patch(f"/api/skills/{skill_id}", json={
        "display_name": "Updated Skill Name",
    }, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated Skill Name"

    # Delete
    resp = await client.delete(f"/api/skills/{skill_id}", headers=headers)
    assert resp.status_code == 204

    # Verify deleted
    resp = await client.get(f"/api/skills/{skill_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_duplicate_skill_name(client):
    """Creating a skill with a duplicate name returns 409."""
    headers = await get_admin_headers(client)
    await client.post("/api/skills", json={
        "name": "dup-skill",
        "display_name": "First Skill",
        "skill_type": "managed",
    }, headers=headers)
    resp = await client.post("/api/skills", json={
        "name": "dup-skill",
        "display_name": "Second Skill",
        "skill_type": "managed",
    }, headers=headers)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_skills_require_admin(client):
    """Non-admin user cannot create skills."""
    token = await register_and_login(client, "normal_user", "normal@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.post("/api/skills", json={
        "name": "unauthorized-skill",
        "display_name": "Should Fail",
        "skill_type": "managed",
    }, headers=headers)
    assert resp.status_code == 403
