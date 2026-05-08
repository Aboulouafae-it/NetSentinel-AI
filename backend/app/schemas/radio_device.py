"""
NetSentinel AI — Radio Devices & Diagnostics Schemas
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


# --- Radio Device Schemas ---

class RadioDeviceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    ip_address: str = Field(min_length=1, max_length=45)
    mac_address: str | None = None
    vendor: str = "other"
    device_model: str | None = None
    firmware_version: str | None = None
    role: str = "unknown"
    frequency_mhz: int | None = None
    channel_width_mhz: int | None = None
    tx_power_dbm: int | None = None
    site_name: str | None = None
    mount_height_meters: float | None = None
    azimuth_deg: float | None = None
    link_name: str | None = None
    link_side: str | None = None
    wireless_link_id: str | UUID | None = None
    adapter_type: str = "manual_only"
    notes: str | None = None


class RadioDeviceResponse(BaseModel):
    id: UUID
    organization_id: UUID | None = None
    name: str
    ip_address: str
    mac_address: str | None = None
    vendor: str
    device_model: str | None = None
    firmware_version: str | None = None
    role: str
    frequency_mhz: int | None = None
    channel_width_mhz: int | None = None
    tx_power_dbm: int | None = None
    site_name: str | None = None
    mount_height_meters: float | None = None
    azimuth_deg: float | None = None
    link_name: str | None = None
    link_side: str | None = None
    adapter_type: str
    is_monitored: bool
    is_online: bool | None = None
    last_seen: datetime | None = None
    last_poll_source: str | None = None
    last_poll_latency_ms: float | None = None
    last_poll_error: str | None = None
    snmp_info: dict | None = None
    latest_device_info: dict | None = None
    latest_interface_status: dict | None = None
    latest_wireless_metrics: dict | None = None
    adapter_capabilities: dict | None = None
    wireless_link_id: UUID | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Diagnostic Report Schemas ---

class ProbableCauseResponse(BaseModel):
    cause: str
    confidence: float
    description: str
    evidence: list[str]
    resembles: list[str]
    additional_checks: list[str]
    recommended_actions: list[str]


class DiagnosticReportResponse(BaseModel):
    measurement_id: str
    link_name: str
    timestamp: str
    overall_health: str
    health_score: int
    causes: list[ProbableCauseResponse]
    metric_summary: dict
