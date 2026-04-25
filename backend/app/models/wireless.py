"""
NetSentinel AI — Wireless Domain Models

Contains the deeply normalized structural foundation for Wireless Link Intelligence:
Physical Mounts, Antenna Profiles, Radio Interfaces, Links, Metrics, and Diagnostics.
Reflects the architectural directives for separating RF physicals from logical links.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import ForeignKey, String, Integer, Float, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class AntennaPolarization(str, enum.Enum):
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"
    DUAL_SLANT = "dual_slant"
    CIRCULAR = "circular"


class RadioMode(str, enum.Enum):
    ACCESS_POINT = "ap"
    STATION = "station"


class LinkType(str, enum.Enum):
    PTP = "ptp"          # Point-to-Point Backhaul
    PTMP_LEG = "ptmp_leg" # Customer Leg of a Point-to-Multipoint Sector


class WirelessLinkStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    ALIGNMENT_NEEDED = "alignment_needed"
    UNKNOWN = "unknown"


class AntennaProfile(Base, UUIDMixin, TimestampMixin):
    """Stores theoretical RF characteristics used to calculate Expected RSSI."""
    __tablename__ = "antenna_profiles"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    gain_dbi: Mapped[float] = mapped_column(Float, nullable=False)
    beamwidth_h_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    beamwidth_v_deg: Mapped[float | None] = mapped_column(Float, nullable=True)
    polarization: Mapped[AntennaPolarization] = mapped_column(SQLEnum(AntennaPolarization), default=AntennaPolarization.DUAL_SLANT, nullable=False)


class PhysicalMount(Base, UUIDMixin, TimestampMixin):
    """Differentiates devices by exact physical placement on a site/tower."""
    __tablename__ = "physical_mounts"

    site_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sites.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False) # e.g., "North Sector Leg - 100ft"
    elevation_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    azimuth_heading_deg: Mapped[float | None] = mapped_column(Float, nullable=True)

    site = relationship("Site")
    interfaces = relationship("RadioInterface", back_populates="mount")


class RadioInterface(Base, UUIDMixin, TimestampMixin):
    """Decouples the radio hardware configuration from the logical link."""
    __tablename__ = "radio_interfaces"

    asset_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    mount_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("physical_mounts.id"), nullable=True)
    antenna_profile_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("antenna_profiles.id"), nullable=True)
    
    mac_address: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    mode: Mapped[RadioMode] = mapped_column(SQLEnum(RadioMode), nullable=False)
    
    frequency_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_width_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tx_power_dbm: Mapped[int | None] = mapped_column(Integer, nullable=True)

    asset = relationship("Asset")
    mount = relationship("PhysicalMount", back_populates="interfaces")
    antenna_profile = relationship("AntennaProfile")


class WirelessLink(Base, UUIDMixin, TimestampMixin):
    """Core entity representing a logical RF connection between two Radio Interfaces."""
    __tablename__ = "wireless_links"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Endpoints
    interface_a_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("radio_interfaces.id"), nullable=False)
    interface_b_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("radio_interfaces.id"), nullable=False)
    
    link_type: Mapped[LinkType] = mapped_column(SQLEnum(LinkType), nullable=False)
    
    # Theoretical Baselines
    theoretical_max_capacity_mbps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_rssi_dbm: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Cached State (Live state, history in metrics)
    status: Mapped[WirelessLinkStatus] = mapped_column(SQLEnum(WirelessLinkStatus), default=WirelessLinkStatus.UNKNOWN, nullable=False)

    # Relationships
    organization = relationship("Organization")
    interface_a = relationship("RadioInterface", foreign_keys=[interface_a_id])
    interface_b = relationship("RadioInterface", foreign_keys=[interface_b_id])
    
    alerts = relationship("Alert", back_populates="wireless_link")
    metrics = relationship("WirelessMetric", back_populates="wireless_link", cascade="all, delete-orphan")
    diagnostics = relationship("FieldDiagnostic", back_populates="wireless_link", cascade="all, delete-orphan")
    maintenance_logs = relationship("MaintenanceLog", back_populates="wireless_link", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<WirelessLink {self.name} [{self.status.value}]>"


class WirelessMetric(Base, UUIDMixin):
    """Time-series telemetry for a wireless link."""
    __tablename__ = "wireless_metrics"
    
    wireless_link_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wireless_links.id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(nullable=False, index=True)
    
    rssi: Mapped[float | None] = mapped_column(Float, nullable=True)
    snr: Mapped[float | None] = mapped_column(Float, nullable=True)
    noise_floor: Mapped[float | None] = mapped_column(Float, nullable=True)
    ccq: Mapped[float | None] = mapped_column(Float, nullable=True) # Client Connection Quality %
    tx_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rx_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    wireless_link = relationship("WirelessLink", back_populates="metrics")


class DiagnosticType(str, enum.Enum):
    SPECTRUM_SCAN = "spectrum_scan"
    ALIGNMENT_CHECK = "alignment_check"
    INTERFERENCE_ANALYSIS = "interference_analysis"
    WEATHER_FADE_ANALYSIS = "weather_fade_analysis"


class FieldDiagnostic(Base, UUIDMixin, TimestampMixin):
    """Analysis or scans performed on a link to determine root causes."""
    __tablename__ = "field_diagnostics"
    
    wireless_link_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wireless_links.id"), nullable=False)
    diagnostic_type: Mapped[DiagnosticType] = mapped_column(SQLEnum(DiagnosticType), nullable=False)
    
    performed_by: Mapped[str | None] = mapped_column(String(255), nullable=True) # User ID or 'AI System'
    findings: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    wireless_link = relationship("WirelessLink", back_populates="diagnostics")


class MaintenanceLog(Base, UUIDMixin, TimestampMixin):
    """Record of physical or configuration changes made to the link/devices."""
    __tablename__ = "maintenance_logs"
    
    wireless_link_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wireless_links.id"), nullable=False)
    
    technician_name: Mapped[str] = mapped_column(String(255), nullable=False)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    parts_replaced: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # State validation
    post_validation_rssi: Mapped[float | None] = mapped_column(Float, nullable=True)
    validation_successful: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    wireless_link = relationship("WirelessLink", back_populates="maintenance_logs")
