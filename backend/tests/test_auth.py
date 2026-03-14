import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # Register
    resp = await client.post("/api/auth/register", json={
        "username": "testguru",
        "email": "test@yoga.com",
        "password": "test123",
        "display_name": "Test Guru",
    })
    assert resp.status_code == 201
    assert resp.json()["username"] == "testguru"

    # Login
    resp = await client.post("/api/auth/login", json={
        "username": "testguru",
        "password": "test123",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    assert token

    # Get me
    resp = await client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Test Guru"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    # Register first
    await client.post("/api/auth/register", json={
        "username": "testguru2",
        "email": "test2@yoga.com",
        "password": "correct",
        "display_name": "Test",
    })

    resp = await client.post("/api/auth/login", json={
        "username": "testguru2",
        "password": "wrong",
    })
    assert resp.status_code == 401
