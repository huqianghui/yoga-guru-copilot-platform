from sqlalchemy import String, Text, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin


class VideoFrame(TimestampMixin, Base):
    __tablename__ = "video_frames"

    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"))
    frame_path: Mapped[str] = mapped_column(String(1000))
    timestamp: Mapped[str] = mapped_column(String(20))  # e.g., "05:23"
    frame_type: Mapped[str] = mapped_column(String(20))  # quality | teaching
    pose_name: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    video: Mapped["Video"] = relationship(back_populates="frames")
