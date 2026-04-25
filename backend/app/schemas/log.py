"""
NetSentinel AI — Log Schemas
"""

import uuid
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field

from app.models.log import LogLevel


class LogEntryBase(BaseModel):
    level: LogLevel = Field(default=LogLevel.INFO)
    source: str = Field(..., max_length=255)
    message: str
    metadata_json: Optional[dict[str, Any]] = None
    asset_id: Optional[uuid.UUID] = None


class LogEntryCreate(LogEntryBase):
    organization_id: uuid.UUID
    timestamp: Optional[datetime] = None


class LogEntryRead(LogEntryBase):
    id: uuid.UUID
    timestamp: datetime
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LogListResponse(BaseModel):
    items: list[LogEntryRead]
    total: int
    page: int
    size: int
