"""
NetSentinel AI — Radio Device Model

Represents a REAL managed wireless radio device (Ubiquiti, MikroTik, TP-Link, etc.)
that the platform can identify, track, and eventually poll for diagnostics.

Stage 1: Store device metadata only (no active polling).
Stage 2: SNMP/SSH polling via adapter layer.
"""

import uuid
import enum
from sqlalchemy import String, Integer, Float, Text, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin, TimestampMixin


class DeviceVendor(str, enum.Enum):
    UBIQUITI = "ubiquiti"
    MIKROTIK = "mikrotik"
    TPLINK = "tplink"
    CAMBIUM = "cambium"
    OTHER = "other"


class AdapterType(str, enum.Enum):
    """How the platform should connect to this device (Stage 2+)."""
    SNMP_V2C = "snmp_v2c"
    SNMP_V3 = "snmp_v3"
    SSH_ROUTEROS = "ssh_routeros"
    UISP_API = "uisp_api"
    MANUAL_ONLY = "manual_only"  # No automated polling — manual readings only


class RadioDeviceRole(str, enum.Enum):
    ACCESS_POINT = "access_point"
    STATION = "station"
    BRIDGE = "bridge"
    REPEATER = "repeater"
    UNKNOWN = "unknown"


class RadioDevice(Base, UUIDMixin, TimestampMixin):
    """
    A real wireless radio device managed by the platform.
    
    Stage 1: Stores identity and metadata. No active polling.
    Stage 2: Will be polled via the adapter specified in adapter_type.
    """
    __tablename__ = "radio_devices"

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)

    # Hardware
    vendor: Mapped[DeviceVendor] = mapped_column(
        SQLEnum(DeviceVendor), default=DeviceVendor.OTHER, nullable=False
    )
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    firmware_version: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # RF Configuration
    role: Mapped[RadioDeviceRole] = mapped_column(
        SQLEnum(RadioDeviceRole), default=RadioDeviceRole.UNKNOWN, nullable=False
    )
    frequency_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_width_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tx_power_dbm: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Location
    site_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mount_height_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    azimuth_deg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Link reference (which link this device belongs to, by name)
    link_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    link_side: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 'A' or 'B'

    # Connection method (for Stage 2 polling)
    adapter_type: Mapped[AdapterType] = mapped_column(
        SQLEnum(AdapterType), default=AdapterType.MANUAL_ONLY, nullable=False
    )

    # NOTE: Credentials are NOT stored here.
    # Stage 2 will use a separate encrypted credentials store.
    # For now, adapter_type=MANUAL_ONLY means no polling.

    # Status
    is_monitored: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<RadioDevice {self.name} ({self.ip_address}) [{self.vendor.value}]>"
