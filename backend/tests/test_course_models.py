import pytest
from sqlalchemy import select

from app.models.course import Course
from app.models.course_pose import CoursePose


@pytest.mark.asyncio
async def test_create_course_model(client):
    """Test that Course and CoursePose models can be created in the DB."""
    # Register and login to get a user_id
    resp = await client.post("/api/auth/register", json={
        "username": "modeltest",
        "email": "model@test.com",
        "password": "test123",
        "display_name": "Model Tester",
    })
    assert resp.status_code == 201
    user_id = resp.json()["id"]

    # Create course directly via ORM (test model, not API)
    from tests.conftest import TestSession
    async with TestSession() as db:
        course = Course(
            title="Test Course",
            theme="Morning Flow",
            duration="60分钟",
            level="中级",
            style="流瑜伽",
            focus="开髋",
            user_id=user_id,
        )
        db.add(course)
        await db.flush()

        pose1 = CoursePose(
            course_id=course.id,
            name="山式",
            duration="2分钟",
            notes="调整呼吸",
            order_index=0,
        )
        pose2 = CoursePose(
            course_id=course.id,
            name="下犬式",
            duration="5次呼吸",
            notes="拉伸后背",
            order_index=1,
        )
        db.add_all([pose1, pose2])
        await db.commit()

        # Verify course was created
        result = await db.execute(select(Course).where(Course.id == course.id))
        saved_course = result.scalar_one()
        assert saved_course.title == "Test Course"
        assert saved_course.style == "流瑜伽"
        assert len(saved_course.poses) == 2
        assert saved_course.poses[0].name == "山式"
        assert saved_course.poses[1].name == "下犬式"


@pytest.mark.asyncio
async def test_course_cascade_delete(client):
    """Test that deleting a course also deletes its poses."""
    resp = await client.post("/api/auth/register", json={
        "username": "cascadetest",
        "email": "cascade@test.com",
        "password": "test123",
        "display_name": "Cascade Tester",
    })
    user_id = resp.json()["id"]

    from tests.conftest import TestSession
    async with TestSession() as db:
        course = Course(
            title="Delete Me",
            duration="30分钟",
            level="初级",
            style="哈达瑜伽",
            user_id=user_id,
        )
        db.add(course)
        await db.flush()

        db.add(CoursePose(
            course_id=course.id,
            name="婴儿式",
            duration="3分钟",
            notes="",
            order_index=0,
        ))
        await db.commit()
        course_id = course.id

        # Delete course
        await db.delete(course)
        await db.commit()

        # Verify poses are also deleted
        result = await db.execute(
            select(CoursePose).where(CoursePose.course_id == course_id)
        )
        remaining_poses = result.scalars().all()
        assert len(remaining_poses) == 0
