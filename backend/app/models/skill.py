from sqlalchemy import String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class Skill(TimestampMixin, Base):
    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    skill_type: Mapped[str] = mapped_column(String(20), default="managed")
    # skill_type: "bundled" | "managed" | "workspace"
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    content: Mapped[str] = mapped_column(Text, default="")
    input_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True)
