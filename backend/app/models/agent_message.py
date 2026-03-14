from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class AgentMessage(TimestampMixin, Base):
    __tablename__ = "agent_messages"

    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("agent_sessions.id"))
    role: Mapped[str] = mapped_column(String(20))  # user | assistant | system
    content: Mapped[str] = mapped_column(Text)

    session: Mapped["AgentSession"] = relationship(back_populates="messages")
