import pytest
from sqlalchemy import select

from tests.conftest import TestSession
from app.models.user import User


async def register_and_login(client, username="admin_user", email="admin@test.com"):
    """Register a user and return their auth token."""
    await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": "testpass123",
        "display_name": "Test User",
    })
    resp = await client.post("/api/auth/login", json={
        "username": username,
        "password": "testpass123",
    })
    return resp.json()["access_token"]


async def make_admin(username="admin_user"):
    """Promote a user to admin role directly in the test DB."""
    async with TestSession() as session:
        result = await session.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one()
        user.role = "admin"
        await session.commit()


async def get_admin_headers(client, username="admin_user", email="admin@test.com"):
    """Register, promote to admin, login, and return auth headers."""
    token = await register_and_login(client, username, email)
    await make_admin(username)
    return {"Authorization": f"Bearer {token}"}


async def get_user_headers(client, username="normal_user", email="user@test.com"):
    """Register a normal user and return auth headers."""
    token = await register_and_login(client, username, email)
    return {"Authorization": f"Bearer {token}"}


# --- Auth / Authorization Tests ---


@pytest.mark.asyncio
async def test_list_configs_requires_auth(client):
    """No token -> 403 (HTTPBearer returns 403 for missing credentials)."""
    resp = await client.get("/api/admin/configs")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_configs_requires_admin(client):
    """Normal (non-admin) user -> 403."""
    headers = await get_user_headers(client)
    resp = await client.get("/api/admin/configs", headers=headers)
    assert resp.status_code == 403


# --- CRUD Tests ---


@pytest.mark.asyncio
async def test_list_configs(client):
    """Admin user can list all configs."""
    headers = await get_admin_headers(client)
    resp = await client.get("/api/admin/configs", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_upsert_config(client):
    """Admin can create and then update a config."""
    headers = await get_admin_headers(client)

    # Create
    resp = await client.put(
        "/api/admin/configs/test_key",
        json={"value": "initial_value"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["key"] == "test_key"
    assert data["value"] == "initial_value"

    # Update
    resp = await client.put(
        "/api/admin/configs/test_key",
        json={"value": "updated_value"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["value"] == "updated_value"

    # Verify via list
    resp = await client.get("/api/admin/configs", headers=headers)
    keys = [c["key"] for c in resp.json()]
    assert "test_key" in keys


@pytest.mark.asyncio
async def test_delete_config(client):
    """Admin can create then delete a config."""
    headers = await get_admin_headers(client)

    # Create
    await client.put(
        "/api/admin/configs/delete_me",
        json={"value": "temp"},
        headers=headers,
    )

    # Delete
    resp = await client.delete("/api/admin/configs/delete_me", headers=headers)
    assert resp.status_code == 204

    # Verify gone
    resp = await client.get("/api/admin/configs", headers=headers)
    keys = [c["key"] for c in resp.json()]
    assert "delete_me" not in keys


@pytest.mark.asyncio
async def test_delete_config_not_found(client):
    """Deleting a non-existent config returns 404."""
    headers = await get_admin_headers(client)
    resp = await client.delete("/api/admin/configs/nonexistent", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_connection_test_not_configured(client):
    """Testing azure-openai connection without configs returns not_configured."""
    headers = await get_admin_headers(client)
    resp = await client.post("/api/admin/test-connection/azure-openai", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "Azure OpenAI"
    assert data["status"] == "not_configured"


@pytest.mark.asyncio
async def test_connection_test_unknown_service(client):
    """Testing an unknown service returns 400."""
    headers = await get_admin_headers(client)
    resp = await client.post("/api/admin/test-connection/unknown-svc", headers=headers)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_seed_defaults(client):
    """Admin can seed default configs."""
    headers = await get_admin_headers(client)
    resp = await client.post("/api/admin/seed-defaults", headers=headers)
    assert resp.status_code == 200

    # Verify defaults were seeded
    resp = await client.get("/api/admin/configs", headers=headers)
    keys = [c["key"] for c in resp.json()]
    assert "azure_openai_endpoint" in keys
    assert "azure_openai_key" in keys


@pytest.mark.asyncio
async def test_list_configs_filter_by_category(client):
    """Admin can filter configs by category."""
    headers = await get_admin_headers(client)

    # Seed defaults first (creates azure_openai and azure_cu categories)
    await client.post("/api/admin/seed-defaults", headers=headers)

    # Filter by category
    resp = await client.get("/api/admin/configs?category=azure_openai", headers=headers)
    assert resp.status_code == 200
    configs = resp.json()
    assert len(configs) > 0
    assert all(c["category"] == "azure_openai" for c in configs)


@pytest.mark.asyncio
async def test_secret_values_masked(client):
    """Secret config values should be masked in responses."""
    headers = await get_admin_headers(client)

    # Seed defaults to get secret configs
    await client.post("/api/admin/seed-defaults", headers=headers)

    # Set a secret value
    await client.put(
        "/api/admin/configs/azure_openai_key",
        json={"value": "sk-very-secret-key-12345"},
        headers=headers,
    )

    # List and check masking
    resp = await client.get("/api/admin/configs", headers=headers)
    for c in resp.json():
        if c["key"] == "azure_openai_key":
            assert c["value"].startswith("***")
            assert c["value"] != "sk-very-secret-key-12345"
            break
    else:
        pytest.fail("azure_openai_key not found in configs")
