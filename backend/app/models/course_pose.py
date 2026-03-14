from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class CoursePose(TimestampMixin, Base):
    __tablename__ = "course_poses"

    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(100))
    duration: Mapped[str] = mapped_column(String(50))
    notes: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer)

    course: Mapped["Course"] = relationship(back_populates="poses")
