from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.course import Course
from app.models.course_pose import CoursePose
from app.schemas.course import CreateCourseRequest, UpdateCourseRequest, GenerateCourseRequest
from app.services.agents.base import AgentRequest, AgentContext
from app.services.agents.dispatcher import dispatch


async def create_course(db: AsyncSession, user_id: str, data: CreateCourseRequest) -> Course:
    course = Course(
        title=data.title,
        theme=data.theme,
        duration=data.duration,
        level=data.level,
        style=data.style,
        focus=data.focus,
        user_id=user_id,
    )
    db.add(course)
    await db.flush()

    for i, pose in enumerate(data.poses):
        db.add(CoursePose(
            course_id=course.id,
            name=pose.name,
            duration=pose.duration,
            notes=pose.notes,
            order_index=i,
        ))

    await db.commit()
    await db.refresh(course)
    return course


async def list_courses(db: AsyncSession, user_id: str) -> list[Course]:
    result = await db.execute(
        select(Course)
        .where(Course.user_id == user_id)
        .order_by(Course.created_at.desc())
    )
    return list(result.scalars().all())


async def get_course(db: AsyncSession, course_id: str) -> Course | None:
    result = await db.execute(select(Course).where(Course.id == course_id))
    return result.scalar_one_or_none()


async def update_course(db: AsyncSession, course_id: str, data: UpdateCourseRequest) -> Course | None:
    course = await get_course(db, course_id)
    if not course:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)
    await db.commit()
    await db.refresh(course)
    return course


async def delete_course(db: AsyncSession, course_id: str) -> bool:
    course = await get_course(db, course_id)
    if course:
        await db.delete(course)
        await db.commit()
        return True
    return False


async def count_courses(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        select(func.count(Course.id)).where(Course.user_id == user_id)
    )
    return result.scalar() or 0


async def generate_course_with_ai(db: AsyncSession, data: GenerateCourseRequest) -> str:
    """Use the course-planner Copilot to generate a course sequence."""
    prompt = f"""请为我生成一个瑜伽课程序列：
- 课程主题：{data.theme or data.style + '课程'}
- 课程时长：{data.duration}
- 难度级别：{data.level}
- 课程类型：{data.style}
- 课程重点：{data.focus or '综合练习'}

请严格按照以下JSON格式输出课程序列：
[{{"name": "体式名称", "duration": "时长", "notes": "注意事项"}}]"""

    request = AgentRequest(
        prompt=prompt,
        agent_name="course-planner",
        context=AgentContext(module="course-planning"),
    )

    full_response = ""
    async for event in dispatch(db, "course-planner", request):
        if event.type == "text":
            full_response += event.content

    return full_response
