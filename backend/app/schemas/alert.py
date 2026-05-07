"""
NetSentinel AI — Alert Schemas
"""

from datetime import datetime
from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    severity: str = "info"
    source: str | None = None
    rule_name: str | None = None
    organization_id: str | None = None
    asset_id: str | None = None
    wireless_link_id: str | None = None
    source_metadata: dict | None = None


class AlertUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    incident_id: str | None = None


class AlertActionRequest(BaseModel):
    note: str | None = None
    assigned_to: str | None = None


class AlertResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    severity: str
    status: str
    source: str | None = None
    rule_name: str | None = None
    organization_id: str | None = None
    asset_id: str | None = None
    incident_id: str | None = None
    wireless_link_id: str | None = None
    source_metadata: dict | None = None
    dedupe_key: str | None = None
    occurrence_count: int
    last_seen: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
