import pytest


async def get_auth_token(client) -> str:
    await client.post("/api/auth/register", json={
        "username": "videoapitest",
        "email": "videoapi@test.com",
        "password": "test123",
        "display_name": "Video Tester",
    })
    resp = await client.post("/api/auth/login", json={
        "username": "videoapitest",
        "password": "test123",
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_upload_video(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "测试视频"},
        files={"file": ("test.mp4", b"fake video content", "video/mp4")},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "测试视频"
    assert data["status"] == "uploaded"
    assert data["file_size"] == len(b"fake video content")


@pytest.mark.asyncio
async def test_list_videos(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Upload two videos
    await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "Video A"},
        files={"file": ("a.mp4", b"content-a", "video/mp4")},
    )
    await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "Video B"},
        files={"file": ("b.mp4", b"content-b", "video/mp4")},
    )

    resp = await client.get("/api/videos/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_video(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    upload_resp = await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "Detail Video"},
        files={"file": ("det.mp4", b"detail-content", "video/mp4")},
    )
    video_id = upload_resp.json()["id"]

    resp = await client.get(f"/api/videos/{video_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Detail Video"
    assert resp.json()["analysis"] is None
    assert resp.json()["frames"] == []


@pytest.mark.asyncio
async def test_delete_video(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    upload_resp = await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "To Delete"},
        files={"file": ("del.mp4", b"del-content", "video/mp4")},
    )
    video_id = upload_resp.json()["id"]

    resp = await client.delete(f"/api/videos/{video_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/videos/{video_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_video(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/videos/nonexistent-id", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_stats_with_videos(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Initially 0
    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["videos"] == 0

    # Upload a video
    await client.post(
        "/api/videos/upload",
        headers=headers,
        data={"title": "Stats Video"},
        files={"file": ("stats.mp4", b"stats-content", "video/mp4")},
    )

    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["videos"] == 1
