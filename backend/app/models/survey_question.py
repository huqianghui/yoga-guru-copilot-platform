from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class SurveyQuestion(TimestampMixin, Base):
    __tablename__ = "survey_questions"

    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    text: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(String(20), default="text")  # text | rating | choice
    order_index: Mapped[int] = mapped_column(Integer)

    survey: Mapped["Survey"] = relationship(back_populates="questions")
