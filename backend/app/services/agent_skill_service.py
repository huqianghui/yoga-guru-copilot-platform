from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_skill import AgentSkill
from app.models.skill import Skill


class AgentSkillService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_skills_for_agent(self, agent_name: str) -> list[Skill]:
        stmt = (
            select(Skill)
            .join(AgentSkill, AgentSkill.skill_id == Skill.id)
            .where(AgentSkill.agent_name == agent_name)
            .order_by(Skill.name)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def assign_skill(self, agent_name: str, skill_id: str) -> AgentSkill:
        link = AgentSkill(agent_name=agent_name, skill_id=skill_id)
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def remove_skill(self, agent_name: str, skill_id: str) -> bool:
        stmt = (
            sa_delete(AgentSkill)
            .where(AgentSkill.agent_name == agent_name)
            .where(AgentSkill.skill_id == skill_id)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount > 0
