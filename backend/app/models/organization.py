"""
NetSentinel AI — Organization Model
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Organization(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    users = relationship("User", back_populates="organization")
    sites = relationship("Site", back_populates="organization", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="organization", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="organization", cascade="all, delete-orphan")
    logs = relationship("LogEntry", back_populates="organization", cascade="all, delete-orphan")
    detection_rules = relationship("DetectionRule", back_populates="organization", cascade="all, delete-orphan")
    iocs = relationship("IndicatorOfCompromise", back_populates="organization", cascade="all, delete-orphan")
    playbook_rules = relationship("PlaybookRule", back_populates="organization", cascade="all, delete-orphan")
    response_actions = relationship("ResponseAction", back_populates="organization", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Organization {self.name}>"
