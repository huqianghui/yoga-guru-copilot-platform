from __future__ import annotations

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AgentSession(TimestampMixin, Base):
    __tablename__ = "agent_sessions"

    agent_name: Mapped[str] = mapped_column(String(50), ForeignKey("agent_configs.name"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200), default="New Chat")
    mode: Mapped[str] = mapped_column(String(20), default="ask")
    native_session_id: Mapped[str | None] = mapped_column(String(200), nullable=True, default=None)
    source: Mapped[str] = mapped_column(String(50), default="playground")

    messages: Mapped[list["AgentMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin"
    )
