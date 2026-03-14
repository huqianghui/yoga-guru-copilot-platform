from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User

router = APIRouter()


@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Dashboard stats — returns counts from each module.
    Placeholder until Phase A/B/C tables exist."""
    return {
        "videos": 0,
        "courses": 0,
        "feedbacks": 0,
        "surveys": 0,
    }
