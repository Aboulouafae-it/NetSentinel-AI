"""
NetSentinel AI — Alert Schemas
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    severity: str = "info"
    source: str | None = None
    rule_name: str | None = None
    organization_id: str | UUID | None = None
    asset_id: str | UUID | None = None
    wireless_link_id: str | UUID | None = None
    source_metadata: dict | None = None


class AlertUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    incident_id: str | UUID | None = None


class AlertActionRequest(BaseModel):
    note: str | None = None
    assigned_to: str | None = None


class AlertResponse(BaseModel):
    id: UUID
    title: str
    description: str | None = None
    severity: str
    status: str
    source: str | None = None
    rule_name: str | None = None
    organization_id: UUID | None = None
    asset_id: UUID | None = None
    incident_id: UUID | None = None
    wireless_link_id: UUID | None = None
    source_metadata: dict | None = None
    dedupe_key: str | None = None
    occurrence_count: int
    last_seen: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
