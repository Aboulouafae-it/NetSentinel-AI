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
    impacted_services: list[str] | None = None


class IncidentAssignRequest(BaseModel):
    assigned_to: str = Field(min_length=1, max_length=255)


class IncidentNoteCreate(BaseModel):
    note: str = Field(min_length=1)


class IncidentEventCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    message: str = Field(min_length=1)


class IncidentTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class IncidentTaskUpdate(BaseModel):
    completed: bool


class IncidentResolveRequest(BaseModel):
    resolution_notes: str = Field(min_length=1)


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    severity: str
    status: str
    assigned_to: str | None = None
    resolution_notes: str | None = None
    notes: list | None = None
    timeline_events: list | None = None
    tasks: list | None = None
    impacted_services: list | None = None
    organization_id: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
