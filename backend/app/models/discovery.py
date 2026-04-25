"""
NetSentinel AI — Discovery Model

Stores REAL discovered hosts from actual ICMP ping sweeps.
No mock data. Every row in this table represents a real network probe result.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum as SQLEnum, Boolean, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin, TimestampMixin


class HostReachability(str, enum.Enum):
    REACHABLE = "reachable"
    UNREACHABLE = "unreachable"


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DiscoveryScan(Base, UUIDMixin, TimestampMixin):
    """Represents a single subnet scan job. Every scan is a real execution."""
    __tablename__ = "discovery_scans"

    subnet: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[ScanStatus] = mapped_column(
        SQLEnum(ScanStatus), default=ScanStatus.PENDING, nullable=False
    )
    total_hosts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reachable_hosts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unreachable_hosts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return f"<DiscoveryScan {self.subnet} [{self.status}]>"


class DiscoveredHost(Base, UUIDMixin, TimestampMixin):
    """
    Represents a REAL host discovered via ICMP ping.
    
    Every row is backed by an actual ping probe — no simulated data.
    - ip_address: the IP that was pinged
    - is_reachable: True only if the host responded to ICMP echo
    - response_time_ms: actual round-trip time from ping output (null if unreachable)
    - last_seen: timestamp of the last successful probe
    """
    __tablename__ = "discovered_hosts"

    ip_address: Mapped[str] = mapped_column(String(45), nullable=False, index=True)
    is_reachable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    hostname_resolved: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        status = "UP" if self.is_reachable else "DOWN"
        return f"<DiscoveredHost {self.ip_address} [{status}]>"
