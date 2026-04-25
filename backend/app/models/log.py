"""
NetSentinel AI — Log Model
"""

import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, Text, DateTime, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class LogLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogEntry(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "logs"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    level: Mapped[LogLevel] = mapped_column(
        SQLEnum(LogLevel), default=LogLevel.INFO, nullable=False
    )
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Extra data like parsed syslog fields, agent metrics, etc.
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Foreign keys
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    # Relationships
    asset = relationship("Asset", back_populates="logs")
    organization = relationship("Organization", back_populates="logs")

    # Indexes for fast querying
    __table_args__ = (
        Index("ix_logs_timestamp", "timestamp"),
        Index("ix_logs_organization_id_timestamp", "organization_id", "timestamp"),
        Index("ix_logs_asset_id_timestamp", "asset_id", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<LogEntry {self.level} - {self.source} - {self.timestamp}>"
