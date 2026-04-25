"""
NetSentinel AI — Organization Schemas
"""

from datetime import datetime
from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    industry: str | None = None
    contact_email: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    industry: str | None = None
    contact_email: str | None = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    industry: str | None = None
    contact_email: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
