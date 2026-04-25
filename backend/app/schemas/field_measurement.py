"""
NetSentinel AI — Field Measurement Schemas

Pydantic validation for real wireless field measurement entries.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class FieldMeasurementCreate(BaseModel):
    """
    Schema for creating a new real field measurement.
    Only link_name is required — all other fields are optional
    because a technician may only capture certain values.
    """
    # Required
    link_name: str = Field(min_length=1, max_length=255, description="Name of the wireless link")

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
    tx_capacity_mbps: float | None = Field(None, ge=0, description="TX throughput in Mbps")
    rx_capacity_mbps: float | None = Field(None, ge=0, description="RX throughput in Mbps")

    # Optional: Status & Notes
    link_status: str = Field("operational", description="Link status: operational, degraded, down, maintenance")
    technician_name: str | None = Field(None, max_length=255, description="Name of person entering this data")
    notes: str | None = Field(None, description="Free-text field notes")


class FieldMeasurementUpdate(BaseModel):
    """Update schema — all fields optional."""
    link_name: str | None = None
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
    link_status: str | None = None
    technician_name: str | None = None
    notes: str | None = None


class FieldMeasurementResponse(BaseModel):
    id: str
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
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
