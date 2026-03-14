from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Survey(TimestampMixin, Base):
    __tablename__ = "surveys"

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    course_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("courses.id"), nullable=True
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | closed

    questions: Mapped[list["SurveyQuestion"]] = relationship(
        back_populates="survey",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="SurveyQuestion.order_index",
    )
    responses: Mapped[list["SurveyResponse"]] = relationship(
        back_populates="survey",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
