import pytest


async def get_auth_token(client) -> str:
    """Register a test user and return a JWT token."""
    await client.post("/api/auth/register", json={
        "username": "coursetest",
        "email": "course@test.com",
        "password": "test123",
        "display_name": "Course Tester",
    })
    resp = await client.post("/api/auth/login", json={
        "username": "coursetest",
        "password": "test123",
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_course(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/courses/", headers=headers, json={
        "title": "Morning Flow",
        "theme": "晨练",
        "duration": "60分钟",
        "level": "中级",
        "style": "流瑜伽",
        "focus": "核心力量",
        "poses": [
            {"name": "山式", "duration": "2分钟", "notes": "调整呼吸"},
            {"name": "下犬式", "duration": "5次呼吸", "notes": "拉伸后链"},
        ],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Morning Flow"
    assert data["theme"] == "晨练"
    assert len(data["poses"]) == 2
    assert data["poses"][0]["name"] == "山式"
    assert data["poses"][1]["order_index"] == 1


@pytest.mark.asyncio
async def test_list_courses(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Create two courses
    await client.post("/api/courses/", headers=headers, json={
        "title": "Course A", "duration": "30分钟", "level": "初级", "style": "哈他",
    })
    await client.post("/api/courses/", headers=headers, json={
        "title": "Course B", "duration": "45分钟", "level": "高级", "style": "阿斯汤加",
    })

    resp = await client.get("/api/courses/", headers=headers)
    assert resp.status_code == 200
    courses = resp.json()
    assert len(courses) == 2


@pytest.mark.asyncio
async def test_get_course(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/courses/", headers=headers, json={
        "title": "Single Course", "duration": "60分钟", "level": "中级", "style": "流瑜伽",
    })
    course_id = create_resp.json()["id"]

    resp = await client.get(f"/api/courses/{course_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Single Course"


@pytest.mark.asyncio
async def test_update_course(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/courses/", headers=headers, json={
        "title": "Old Title", "duration": "60分钟", "level": "中级", "style": "流瑜伽",
    })
    course_id = create_resp.json()["id"]

    resp = await client.put(f"/api/courses/{course_id}", headers=headers, json={
        "title": "New Title",
        "level": "高级",
    })
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"
    assert resp.json()["level"] == "高级"
    assert resp.json()["style"] == "流瑜伽"  # unchanged


@pytest.mark.asyncio
async def test_delete_course(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/courses/", headers=headers, json={
        "title": "To Delete", "duration": "30分钟", "level": "初级", "style": "阴瑜伽",
    })
    course_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/courses/{course_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/courses/{course_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_course(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.get("/api/courses/nonexistent-id", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_dashboard_stats_with_courses(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Initially 0 courses
    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["courses"] == 0

    # Create a course
    await client.post("/api/courses/", headers=headers, json={
        "title": "Stats Test", "duration": "30分钟", "level": "初级", "style": "哈他",
    })

    # Now 1 course
    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["courses"] == 1
