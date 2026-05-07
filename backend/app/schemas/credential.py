"""Credential profile schemas."""

from datetime import datetime
from pydantic import BaseModel, Field


class CredentialProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    credential_type: str
    username: str | None = None
    secret_material: str | None = None
    config: dict | None = None


class CredentialProfileResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    credential_type: str
    username: str | None = None
    config: dict | None = None
    has_secret: bool
    created_at: datetime
    updated_at: datetime


def credential_response(profile) -> dict:
    return {
        "id": str(profile.id),
        "organization_id": str(profile.organization_id),
        "name": profile.name,
        "credential_type": profile.credential_type.value if hasattr(profile.credential_type, "value") else profile.credential_type,
        "username": profile.username,
        "config": profile.config,
        "has_secret": bool(profile.secret_material),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }
