from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillUpdate


class SkillService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all(
        self,
        skill_type: str | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> list[Skill]:
        stmt = select(Skill).order_by(Skill.name)
        if skill_type:
            stmt = stmt.where(Skill.skill_type == skill_type)
        if category:
            stmt = stmt.where(Skill.category == category)
        if search:
            stmt = stmt.where(Skill.name.ilike(f"%{search}%"))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, skill_id: str) -> Skill | None:
        stmt = select(Skill).where(Skill.id == skill_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Skill | None:
        stmt = select(Skill).where(Skill.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: SkillCreate) -> Skill:
        skill = Skill(**data.model_dump())
        self.db.add(skill)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def update(self, skill_id: str, data: SkillUpdate) -> Skill | None:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(skill, key, value)
        await self.db.commit()
        await self.db.refresh(skill)
        return skill

    async def delete(self, skill_id: str) -> bool:
        skill = await self.get_by_id(skill_id)
        if not skill:
            return False
        await self.db.delete(skill)
        await self.db.commit()
        return True
