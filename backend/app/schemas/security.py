"""
NetSentinel AI — Security Schemas
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DetectionRuleBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    severity: str = Field(default="high")
    is_active: bool = Field(default=True)
    target_field: str = Field(..., max_length=100)
    condition: str = Field(..., max_length=50)
    pattern: str = Field(..., max_length=500)


class DetectionRuleCreate(DetectionRuleBase):
    organization_id: uuid.UUID


class DetectionRuleRead(DetectionRuleBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IOCBase(BaseModel):
    ioc_type: str = Field(..., max_length=50)
    value: str = Field(..., max_length=255)
    description: Optional[str] = None
    confidence: int = Field(default=100, ge=0, le=100)


class IOCCreate(IOCBase):
    organization_id: uuid.UUID


class IOCRead(IOCBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
