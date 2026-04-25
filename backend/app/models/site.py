"""
NetSentinel AI — Site Model
"""

import uuid
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Site(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sites"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    subnet: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "192.168.1.0/24"

    # Foreign key
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    # Relationships
    organization = relationship("Organization", back_populates="sites")
    assets = relationship("Asset", back_populates="site", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Site {self.name}>"
