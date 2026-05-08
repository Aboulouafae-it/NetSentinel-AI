"""
NetSentinel AI — Site Schemas
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class SiteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    location: str | None = None
    description: str | None = None
    subnet: str | None = None
    organization_id: str | UUID


class SiteUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    description: str | None = None
    subnet: str | None = None


class SiteResponse(BaseModel):
    id: UUID
    name: str
    location: str | None = None
    description: str | None = None
    subnet: str | None = None
    organization_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
