"""Edge Agent schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class AgentRegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    agent_uid: str | None = None
    site_id: str | UUID | None = None
    version: str | None = None
    hostname: str | None = None
    ip_address: str | None = None


class AgentRegisterResponse(BaseModel):
    id: str
    agent_uid: str
    token: str


class AgentHeartbeatRequest(BaseModel):
    agent_uid: str | None = None
    status: str = "healthy"
    version: str | None = None
    hostname: str | None = None
    ip_address: str | None = None
    health_metadata: dict | None = None


class EdgeAgentResponse(BaseModel):
    id: UUID
    organization_id: UUID
    site_id: UUID | None = None
    name: str
    agent_uid: str
    version: str | None = None
    hostname: str | None = None
    ip_address: str | None = None
    status: str
    last_seen: datetime | None = None
    health_metadata: dict | None = None
    revoked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
