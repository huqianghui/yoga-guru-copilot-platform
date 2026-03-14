from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Course(TimestampMixin, Base):
    __tablename__ = "courses"

    title: Mapped[str] = mapped_column(String(200))
    theme: Mapped[str] = mapped_column(Text, default="")
    duration: Mapped[str] = mapped_column(String(20))       # e.g., "60分钟"
    level: Mapped[str] = mapped_column(String(20))           # e.g., "中级"
    style: Mapped[str] = mapped_column(String(50))           # e.g., "流瑜伽"
    focus: Mapped[str] = mapped_column(Text, default="")     # e.g., "开髋，核心力量"
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    poses: Mapped[list["CoursePose"]] = relationship(
        back_populates="course", cascade="all, delete-orphan",
        lazy="selectin", order_by="CoursePose.order_index"
    )
