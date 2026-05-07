"""Credential profile model for read-only device integrations."""

import enum
import uuid
from sqlalchemy import ForeignKey, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin, TimestampMixin


class CredentialType(str, enum.Enum):
    SNMP_V2C = "snmp_v2c"
    SNMP_V3 = "snmp_v3"
    API_TOKEN = "api_token"
    ROUTEROS = "routeros"


class CredentialProfile(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "credential_profiles"

    organization_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    credential_type: Mapped[CredentialType] = mapped_column(SQLEnum(CredentialType), nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    secret_material: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
