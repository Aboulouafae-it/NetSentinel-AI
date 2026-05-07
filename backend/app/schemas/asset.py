"""
NetSentinel AI — Asset Schemas
"""

from datetime import datetime
from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    hostname: str = Field(min_length=1, max_length=255)
    ip_address: str | None = None
    mac_address: str | None = None
    asset_type: str = "other"
    os_info: str | None = None
    vendor: str | None = None
    description: str | None = None
    last_seen: datetime | None = None
    site_id: str | None = None


class AssetUpdate(BaseModel):
    hostname: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    asset_type: str | None = None
    status: str | None = None
    os_info: str | None = None
    vendor: str | None = None
    description: str | None = None
    last_seen: datetime | None = None


class AssetResponse(BaseModel):
    id: str
    hostname: str
    ip_address: str | None = None
    mac_address: str | None = None
    asset_type: str
    status: str
    os_info: str | None = None
    vendor: str | None = None
    description: str | None = None
    last_seen: datetime | None = None
    site_id: str
    risk_level: str | None = None
    risk_reasons: list[str] | None = None
    related_alerts_count: int = 0
    last_poll_status: str | None = None
    last_telemetry_source: str | None = None
    last_poll_latency_ms: float | None = None
    last_poll_packet_loss_percent: float | None = None
    last_poll_error: str | None = None
    last_polled_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
