"""
NetSentinel AI — Wireless Schemas

Pydantic schemas corresponding to the Wireless Link Intelligence domain models.
"""

from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field

# --- Antenna Profile Schemas ---

class AntennaProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    gain_dbi: float
    beamwidth_h_deg: float | None = None
    beamwidth_v_deg: float | None = None
    polarization: str

class AntennaProfileCreate(AntennaProfileBase):
    pass

class AntennaProfileResponse(AntennaProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Physical Mount Schemas ---

class PhysicalMountBase(BaseModel):
    site_id: str | UUID
    name: str = Field(min_length=1, max_length=255)
    elevation_meters: float | None = None
    azimuth_heading_deg: float | None = None

class PhysicalMountCreate(PhysicalMountBase):
    pass

class PhysicalMountResponse(PhysicalMountBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Radio Interface Schemas ---

class RadioInterfaceBase(BaseModel):
    asset_id: str | UUID
    mount_id: str | UUID | None = None
    antenna_profile_id: str | UUID | None = None
    mac_address: str = Field(min_length=1, max_length=50)
    mode: str
    frequency_mhz: int | None = None
    channel_width_mhz: int | None = None
    tx_power_dbm: int | None = None

class RadioInterfaceCreate(RadioInterfaceBase):
    pass

class RadioInterfaceResponse(RadioInterfaceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Wireless Link Schemas ---

class WirelessLinkBase(BaseModel):
    organization_id: str | UUID
    name: str = Field(min_length=1, max_length=255)
    interface_a_id: str | UUID
    interface_b_id: str | UUID
    link_type: str
    theoretical_max_capacity_mbps: int | None = None
    expected_rssi_dbm: float | None = None
    near_end_radio_id: str | UUID | None = None
    far_end_radio_id: str | UUID | None = None

class WirelessLinkCreate(WirelessLinkBase):
    pass

class WirelessLinkUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    theoretical_max_capacity_mbps: int | None = None
    expected_rssi_dbm: float | None = None
    near_end_radio_id: str | UUID | None = None
    far_end_radio_id: str | UUID | None = None

class WirelessLinkResponse(WirelessLinkBase):
    id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Wireless Metric Schemas ---

class WirelessMetricCreate(BaseModel):
    wireless_link_id: str | UUID
    timestamp: datetime
    rssi: float | None = None
    snr: float | None = None
    noise_floor: float | None = None
    ccq: float | None = None
    tx_capacity: int | None = None
    rx_capacity: int | None = None

class WirelessMetricResponse(WirelessMetricCreate):
    id: UUID

    model_config = {"from_attributes": True}


# --- Diagnostic Schemas ---

class FieldDiagnosticCreate(BaseModel):
    wireless_link_id: str | UUID
    diagnostic_type: str
    performed_by: str | None = None
    findings: str
    recommendation: str | None = None

class FieldDiagnosticResponse(FieldDiagnosticCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Maintenance Log Schemas ---

class MaintenanceLogCreate(BaseModel):
    wireless_link_id: str | UUID
    technician_name: str
    action_taken: str
    parts_replaced: str | None = None
    post_validation_rssi: float | None = None
    validation_successful: bool = False

class MaintenanceLogResponse(MaintenanceLogCreate):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
