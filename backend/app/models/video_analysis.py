from sqlalchemy import String, Text, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class VideoAnalysis(TimestampMixin, Base):
    __tablename__ = "video_analyses"

    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), unique=True)
    teaching_style: Mapped[str] = mapped_column(String(100), default="")
    rhythm: Mapped[str] = mapped_column(String(100), default="")
    guidance_method: Mapped[str] = mapped_column(String(100), default="")
    core_philosophy: Mapped[str] = mapped_column(Text, default="")
    high_freq_words: Mapped[list] = mapped_column(JSON, default=list)
    raw_result: Mapped[dict] = mapped_column(JSON, default=dict)

    video: Mapped["Video"] = relationship(back_populates="analysis")
