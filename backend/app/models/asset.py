"""
NetSentinel AI — Asset Model
"""

import uuid
from sqlalchemy import ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base, UUIDMixin, TimestampMixin


class AssetType(str, enum.Enum):
    SERVER = "server"
    WORKSTATION = "workstation"
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    ACCESS_POINT = "access_point"
    PRINTER = "printer"
    IOT_DEVICE = "iot_device"
    OTHER = "other"


class AssetStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"


class Asset(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "assets"

    hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)
    asset_type: Mapped[AssetType] = mapped_column(
        SQLEnum(AssetType), default=AssetType.OTHER, nullable=False
    )
    status: Mapped[AssetStatus] = mapped_column(
        SQLEnum(AssetStatus), default=AssetStatus.UNKNOWN, nullable=False
    )
    os_info: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Foreign key (nullable for auto-discovered assets not yet assigned to a site)
    site_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sites.id"), nullable=True
    )

    # Relationships
    site = relationship("Site", back_populates="assets")
    alerts = relationship("Alert", back_populates="asset")
    logs = relationship("LogEntry", back_populates="asset", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Asset {self.hostname} ({self.ip_address})>"
