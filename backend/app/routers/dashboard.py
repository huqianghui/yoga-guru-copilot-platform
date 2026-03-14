from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.course_service import count_courses
from app.services.survey_service import count_surveys, count_responses

router = APIRouter()


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Dashboard stats — returns counts from each module."""
    courses_count = await count_courses(db, user.id)
    surveys_count = await count_surveys(db, user.id)
    feedbacks_count = await count_responses(db, user.id)
    return {
        "videos": 0,
        "courses": courses_count,
        "feedbacks": feedbacks_count,
        "surveys": surveys_count,
    }
