"""
NetSentinel AI — Automation Models (Phase 6)

PlaybookRule: defines an automated response to trigger when certain conditions are met.
ResponseAction: records every automated action taken by the system.
"""

import uuid
import enum
from sqlalchemy import ForeignKey, String, Text, Boolean, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class ActionType(str, enum.Enum):
    CREATE_INCIDENT = "create_incident"
    SEND_WEBHOOK = "send_webhook"
    SEND_EMAIL = "send_email"
    ISOLATE_ASSET = "isolate_asset"
    ADD_IOC = "add_ioc"


class PlaybookRule(Base, UUIDMixin, TimestampMixin):
    """
    A conditional automation rule:
    "When alert severity == CRITICAL → create_incident"
    """
    __tablename__ = "playbook_rules"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Trigger condition
    trigger_on_severity: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "critical"
    trigger_on_source: Mapped[str | None] = mapped_column(String(255), nullable=True)   # e.g. "ThreatEngine"

    # Action to perform
    action_type: Mapped[ActionType] = mapped_column(SQLEnum(ActionType), nullable=False)
    action_config: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON config string

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    organization = relationship("Organization", back_populates="playbook_rules")
    response_actions = relationship("ResponseAction", back_populates="playbook_rule")

    def __repr__(self) -> str:
        return f"<PlaybookRule {self.name} → {self.action_type.value}>"


class ResponseAction(Base, UUIDMixin, TimestampMixin):
    """Records every automated action executed by the Response Engine."""
    __tablename__ = "response_actions"

    status: Mapped[str] = mapped_column(String(50), default="executed", nullable=False)
    result_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    playbook_rule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("playbook_rules.id"), nullable=False
    )
    alert_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alerts.id"), nullable=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    playbook_rule = relationship("PlaybookRule", back_populates="response_actions")
    organization = relationship("Organization", back_populates="response_actions")

    def __repr__(self) -> str:
        return f"<ResponseAction {self.status}>"
