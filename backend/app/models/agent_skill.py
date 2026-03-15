from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentSkill(TimestampMixin, Base):
    __tablename__ = "agent_skills"
    __table_args__ = (
        UniqueConstraint("agent_name", "skill_id", name="uq_agent_skill"),
    )

    agent_name: Mapped[str] = mapped_column(String(50), index=True)
    skill_id: Mapped[str] = mapped_column(String(36), index=True)
