from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.base import TimestampMixin


class ServiceConfig(TimestampMixin, Base):
    """Admin-configurable service settings.

    Stores Azure OpenAI, Content Understanding, and other service configs.
    Values here override environment variable defaults.
    """

    __tablename__ = "service_configs"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str] = mapped_column(String(500), default="")
    category: Mapped[str] = mapped_column(String(50), default="general")
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)
