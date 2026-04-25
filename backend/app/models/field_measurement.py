"""
NetSentinel AI — Field Measurement Model

Stores REAL wireless link measurements entered manually by field technicians.
Every row represents an actual reading taken from real equipment on-site.

No mock data. No simulation. No random generation.
If a value is NULL, it means the technician did not measure it — not that
we failed to generate a fake number.
"""

import uuid
import enum
from sqlalchemy import String, Float, Integer, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin, TimestampMixin


class LinkStatus(str, enum.Enum):
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    DOWN = "down"
    MAINTENANCE = "maintenance"


class FieldMeasurement(Base, UUIDMixin, TimestampMixin):
    """
    A single real wireless link measurement record.

    This is NOT tied to the complex WirelessLink model with its
    radio interfaces and antenna profiles. This is a standalone,
    simple record that a field technician fills in after visiting
    a site or reading values from a device dashboard.

    Every field is optional except link_name, because a technician
    may only measure some parameters depending on equipment access.
    """
    __tablename__ = "field_measurements"

    # --- Link Identity ---
    link_name: Mapped[str] = mapped_column(String(255), nullable=False)
    origin_site: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination_site: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # --- Equipment Info ---
    vendor: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- RF Configuration ---
    frequency_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_width_mhz: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # --- Real Measured RF Values ---
    rssi_dbm: Mapped[float | None] = mapped_column(Float, nullable=True)
    snr_db: Mapped[float | None] = mapped_column(Float, nullable=True)
    noise_floor_dbm: Mapped[float | None] = mapped_column(Float, nullable=True)
    ccq_percent: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Real Performance Metrics ---
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    packet_loss_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    tx_capacity_mbps: Mapped[float | None] = mapped_column(Float, nullable=True)
    rx_capacity_mbps: Mapped[float | None] = mapped_column(Float, nullable=True)

    # --- Status & Notes ---
    link_status: Mapped[LinkStatus] = mapped_column(
        SQLEnum(LinkStatus), default=LinkStatus.OPERATIONAL, nullable=False
    )
    technician_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<FieldMeasurement {self.link_name} RSSI={self.rssi_dbm}>"
