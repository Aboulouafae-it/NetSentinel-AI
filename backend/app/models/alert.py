"""
NetSentinel AI — Alert Model
"""

import uuid
from sqlalchemy import ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, UUIDMixin, TimestampMixin


class AlertSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class Alert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "alerts"

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[AlertSeverity] = mapped_column(
        SQLEnum(AlertSeverity), default=AlertSeverity.INFO, nullable=False
    )
    status: Mapped[AlertStatus] = mapped_column(
        SQLEnum(AlertStatus), default=AlertStatus.OPEN, nullable=False
    )
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rule_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Foreign keys (organization_id nullable for system-generated alerts)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True
    )
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assets.id"), nullable=True
    )
    wireless_link_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("wireless_links.id"), nullable=True
    )
    incident_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=True
    )

    # Relationships
    organization = relationship("Organization", back_populates="alerts")
    asset = relationship("Asset", back_populates="alerts")
    wireless_link = relationship("WirelessLink", back_populates="alerts")
    incident = relationship("Incident", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert {self.title} [{self.severity.value}]>"
