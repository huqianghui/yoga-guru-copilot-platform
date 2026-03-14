from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class SurveyResponse(TimestampMixin, Base):
    __tablename__ = "survey_responses"

    survey_id: Mapped[str] = mapped_column(String(36), ForeignKey("surveys.id"))
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("survey_questions.id"))
    respondent_name: Mapped[str] = mapped_column(String(100), default="Anonymous")
    answer: Mapped[str] = mapped_column(Text)
    satisfaction: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5

    survey: Mapped["Survey"] = relationship(back_populates="responses")
