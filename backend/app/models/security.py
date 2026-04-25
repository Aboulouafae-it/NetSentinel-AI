"""
NetSentinel AI — Security Models (Detection Rules & IOCs)
"""

import uuid
from sqlalchemy import ForeignKey, String, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class DetectionRule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "detection_rules"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="high", nullable=False) # critical, high, medium, low
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Simple rule definition (could be more complex JSON in a real system)
    target_field: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "source_ip", "message"
    condition: Mapped[str] = mapped_column(String(50), nullable=False)     # e.g. "equals", "contains", "regex"
    pattern: Mapped[str] = mapped_column(String(500), nullable=False)      # e.g. "192.168.1.100", "failed password"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    
    # Relationships
    organization = relationship("Organization", back_populates="detection_rules")

    def __repr__(self) -> str:
        return f"<DetectionRule {self.name}>"


class IndicatorOfCompromise(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "iocs"

    ioc_type: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "ip", "domain", "hash"
    value: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[int] = mapped_column(Integer, default=100) # 0-100

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="iocs")

    def __repr__(self) -> str:
        return f"<IOC {self.ioc_type}:{self.value}>"
