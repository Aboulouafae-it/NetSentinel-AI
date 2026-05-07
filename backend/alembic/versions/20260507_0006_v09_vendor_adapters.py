"""v0.9 vendor adapters radio snapshots

Revision ID: 20260507_0006
Revises: 20260507_0005
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260507_0006"
down_revision = "20260507_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("radio_devices", sa.Column("latest_device_info", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("radio_devices", sa.Column("latest_interface_status", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("radio_devices", sa.Column("latest_wireless_metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("radio_devices", sa.Column("adapter_capabilities", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column("radio_devices", "adapter_capabilities")
    op.drop_column("radio_devices", "latest_wireless_metrics")
    op.drop_column("radio_devices", "latest_interface_status")
    op.drop_column("radio_devices", "latest_device_info")
