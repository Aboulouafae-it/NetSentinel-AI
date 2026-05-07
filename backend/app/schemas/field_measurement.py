"""
NetSentinel AI — Field Measurement Schemas

Pydantic validation for real wireless field measurement entries.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FieldMeasurementCreate(BaseModel):
    """
    Schema for creating a new real field measurement.
    Only link_name is required — all other fields are optional
    because a technician may only capture certain values.
    """
    wireless_link_id: str | None = Field(None, description="Real wireless link ID, when known")
    link_name: str | None = Field(None, min_length=1, max_length=255, description="Fallback wireless link name")

    # Optional: Site info
    origin_site: str | None = Field(None, max_length=255, description="Origin/near-end site name")
    destination_site: str | None = Field(None, max_length=255, description="Destination/far-end site name")

    # Optional: Equipment
    vendor: str | None = Field(None, max_length=100, description="Equipment vendor (e.g. Ubiquiti, MikroTik, Cambium)")
    device_model: str | None = Field(None, max_length=100, description="Device model (e.g. AF60-LR, LHG XL 52)")

    # Optional: RF Config
    frequency_mhz: int | None = Field(None, ge=800, le=80000, description="Operating frequency in MHz")
    channel_width_mhz: int | None = Field(None, ge=5, le=160, description="Channel width in MHz")

    # Optional: Real RF values
    rssi_dbm: float | None = Field(None, ge=-100, le=0, description="RSSI in dBm (real measured value)")
    snr_db: float | None = Field(None, ge=0, le=70, description="Signal-to-Noise ratio in dB")
    noise_floor_dbm: float | None = Field(None, ge=-120, le=-30, description="Noise floor in dBm")
    ccq_percent: float | None = Field(None, ge=0, le=100, description="Client Connection Quality in %")

    # Optional: Performance
    latency_ms: float | None = Field(None, ge=0, le=10000, description="Latency in milliseconds")
    packet_loss_percent: float | None = Field(None, ge=0, le=100, description="Packet loss percentage")
    tx_capacity_mbps: float | None = Field(None, ge=0, le=100000, description="TX throughput in Mbps")
    rx_capacity_mbps: float | None = Field(None, ge=0, le=100000, description="RX throughput in Mbps")

    # Optional: Status & Notes
    link_status: Literal["operational", "degraded", "down", "maintenance"] = Field(
        "operational",
        description="Link status: operational, degraded, down, maintenance",
    )
    technician_name: str | None = Field(None, max_length=255, description="Name of person entering this data")
    notes: str | None = Field(None, description="Free-text field notes")


class FieldMeasurementUpdate(BaseModel):
    """Update schema — all fields optional."""
    link_name: str | None = None
    wireless_link_id: str | None = None
    origin_site: str | None = None
    destination_site: str | None = None
    vendor: str | None = None
    device_model: str | None = None
    frequency_mhz: int | None = Field(None, ge=800, le=80000)
    channel_width_mhz: int | None = Field(None, ge=5, le=160)
    rssi_dbm: float | None = Field(None, ge=-100, le=0)
    snr_db: float | None = Field(None, ge=0, le=70)
    noise_floor_dbm: float | None = Field(None, ge=-120, le=-30)
    ccq_percent: float | None = Field(None, ge=0, le=100)
    latency_ms: float | None = Field(None, ge=0, le=10000)
    packet_loss_percent: float | None = Field(None, ge=0, le=100)
    tx_capacity_mbps: float | None = Field(None, ge=0, le=100000)
    rx_capacity_mbps: float | None = Field(None, ge=0, le=100000)
    link_status: Literal["operational", "degraded", "down", "maintenance"] | None = None
    technician_name: str | None = None
    notes: str | None = None


class WirelessDiagnosisResponse(BaseModel):
    health_score: int
    status: Literal["Excellent", "Good", "Degraded", "Poor", "Critical"]
    severity: Literal["info", "low", "medium", "high", "critical"]
    likely_root_cause: str
    recommended_actions: list[str]
    evidence: list[str]


class FieldMeasurementResponse(BaseModel):
    id: str
    organization_id: str | None = None
    wireless_link_id: str | None = None
    link_name: str
    origin_site: str | None = None
    destination_site: str | None = None
    vendor: str | None = None
    device_model: str | None = None
    frequency_mhz: int | None = None
    channel_width_mhz: int | None = None
    rssi_dbm: float | None = None
    snr_db: float | None = None
    noise_floor_dbm: float | None = None
    ccq_percent: float | None = None
    latency_ms: float | None = None
    packet_loss_percent: float | None = None
    tx_capacity_mbps: float | None = None
    rx_capacity_mbps: float | None = None
    link_status: str
    technician_name: str | None = None
    notes: str | None = None
    diagnosis: WirelessDiagnosisResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
