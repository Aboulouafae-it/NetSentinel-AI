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
    site_id: str


class AssetUpdate(BaseModel):
    hostname: str | None = None
    ip_address: str | None = None
    mac_address: str | None = None
    asset_type: str | None = None
    status: str | None = None
    os_info: str | None = None
    vendor: str | None = None
    description: str | None = None


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
    site_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
