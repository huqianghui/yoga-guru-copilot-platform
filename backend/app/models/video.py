from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class Video(TimestampMixin, Base):
    __tablename__ = "videos"

    title: Mapped[str] = mapped_column(String(200))
    filename: Mapped[str] = mapped_column(String(500))
    file_path: Mapped[str] = mapped_column(String(1000))
    file_size: Mapped[int] = mapped_column(Integer)  # bytes
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="uploaded")  # uploaded | analyzing | analyzed | error
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    analysis: Mapped["VideoAnalysis | None"] = relationship(
        back_populates="video", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )
    frames: Mapped[list["VideoFrame"]] = relationship(
        back_populates="video", cascade="all, delete-orphan", lazy="selectin"
    )
