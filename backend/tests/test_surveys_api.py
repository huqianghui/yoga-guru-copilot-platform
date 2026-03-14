import pytest


async def get_auth_token(client) -> str:
    await client.post("/api/auth/register", json={
        "username": "surveyapitest",
        "email": "surveyapi@test.com",
        "password": "test123",
        "display_name": "Survey Tester",
    })
    resp = await client.post("/api/auth/login", json={
        "username": "surveyapitest",
        "password": "test123",
    })
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_survey(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/api/surveys/", headers=headers, json={
        "title": "课后反馈问卷",
        "description": "流瑜伽课后收集",
        "questions": [
            {"text": "课程整体感受如何？", "question_type": "text"},
            {"text": "请对课程打分(1-5)", "question_type": "rating"},
        ],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "课后反馈问卷"
    assert len(data["questions"]) == 2
    assert data["status"] == "draft"


@pytest.mark.asyncio
async def test_list_surveys(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/api/surveys/", headers=headers, json={
        "title": "Survey A",
    })
    await client.post("/api/surveys/", headers=headers, json={
        "title": "Survey B",
    })

    resp = await client.get("/api/surveys/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_get_survey(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/surveys/", headers=headers, json={
        "title": "Detail Survey",
        "questions": [{"text": "Q1"}],
    })
    survey_id = create_resp.json()["id"]

    resp = await client.get(f"/api/surveys/{survey_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Detail Survey"
    assert len(resp.json()["questions"]) == 1


@pytest.mark.asyncio
async def test_delete_survey(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/surveys/", headers=headers, json={
        "title": "To Delete",
    })
    survey_id = create_resp.json()["id"]

    resp = await client.delete(f"/api/surveys/{survey_id}", headers=headers)
    assert resp.status_code == 204

    resp = await client.get(f"/api/surveys/{survey_id}", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_submit_response(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = await client.post("/api/surveys/", headers=headers, json={
        "title": "Feedback Survey",
        "questions": [{"text": "How was it?", "question_type": "text"}],
    })
    survey = create_resp.json()
    survey_id = survey["id"]
    question_id = survey["questions"][0]["id"]

    resp = await client.post(f"/api/surveys/{survey_id}/responses", json={
        "question_id": question_id,
        "respondent_name": "Alice",
        "answer": "Great class!",
        "satisfaction": 5,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "Great class!"
    assert data["satisfaction"] == 5


@pytest.mark.asyncio
async def test_dashboard_stats_with_surveys(client):
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Initially 0
    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["surveys"] == 0
    assert resp.json()["feedbacks"] == 0

    # Create a survey with a question
    create_resp = await client.post("/api/surveys/", headers=headers, json={
        "title": "Stats Survey",
        "questions": [{"text": "Rate us"}],
    })
    survey = create_resp.json()

    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["surveys"] == 1

    # Submit a response
    await client.post(f"/api/surveys/{survey['id']}/responses", json={
        "question_id": survey["questions"][0]["id"],
        "answer": "5",
        "satisfaction": 5,
    })

    resp = await client.get("/api/dashboard/stats", headers=headers)
    assert resp.json()["feedbacks"] == 1
