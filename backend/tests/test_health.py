import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_health_check_no_auth(client):
    """Health check should not require authentication."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
