from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class AgentConfig(TimestampMixin, Base):
    __tablename__ = "agent_configs"

    name: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text)
    system_prompt: Mapped[str] = mapped_column(Text)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    preferred_agent: Mapped[str] = mapped_column(String(50), default="azure-openai")
    fallback_agents: Mapped[list] = mapped_column(JSON, default=list)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    model_config_json: Mapped[dict] = mapped_column(
        JSON, default=dict, name="model_config"
    )
