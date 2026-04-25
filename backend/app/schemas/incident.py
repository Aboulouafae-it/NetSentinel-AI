"""
NetSentinel AI — Incident Schemas
"""

from datetime import datetime
from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    severity: str = "medium"
    assigned_to: str | None = None
    organization_id: str | None = None


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    resolution_notes: str | None = None


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    severity: str
    status: str
    assigned_to: str | None = None
    resolution_notes: str | None = None
    organization_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
