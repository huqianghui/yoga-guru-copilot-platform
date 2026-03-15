from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.status import HTTP_201_CREATED, HTTP_204_NO_CONTENT

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.routers.admin import require_admin
from app.services.skill_service import SkillService
from app.schemas.skill import (
    SkillCreate,
    SkillUpdate,
    SkillResponse,
    SkillBriefResponse,
)

router = APIRouter(tags=["skills"])


@router.get("", response_model=list[SkillBriefResponse])
async def list_skills(
    skill_type: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    svc = SkillService(db)
    return await svc.list_all(skill_type=skill_type, category=category, search=search)


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    svc = SkillService(db)
    skill = await svc.get_by_id(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.post("", response_model=SkillResponse, status_code=HTTP_201_CREATED)
async def create_skill(
    body: SkillCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    existing = await svc.get_by_name(body.name)
    if existing:
        raise HTTPException(status_code=409, detail="Skill name already exists")
    return await svc.create(body)


@router.patch("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str,
    body: SkillUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    updated = await svc.update(skill_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Skill not found")
    return updated


@router.delete("/{skill_id}", status_code=HTTP_204_NO_CONTENT)
async def delete_skill(
    skill_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    svc = SkillService(db)
    deleted = await svc.delete(skill_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Skill not found")
