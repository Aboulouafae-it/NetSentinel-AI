"""
NetSentinel AI — Radio Devices & Diagnostics Schemas
"""

from datetime import datetime
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
    adapter_type: str = "manual_only"
    notes: str | None = None


class RadioDeviceResponse(BaseModel):
    id: str
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
