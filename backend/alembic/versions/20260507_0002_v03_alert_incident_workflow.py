"""v0.3 alert and incident workflow

Revision ID: 20260507_0002
Revises: 20260507_0001
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260507_0002"
down_revision = "20260507_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Retained as historical revision marker. The public-alpha baseline
    # revision creates these columns/status values directly.
    return
    op.execute("ALTER TYPE alertstatus ADD VALUE IF NOT EXISTS 'ESCALATED'")
    op.execute("ALTER TYPE alertstatus ADD VALUE IF NOT EXISTS 'escalated'")
    op.add_column("incidents", sa.Column("notes", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("incidents", sa.Column("timeline_events", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("incidents", sa.Column("tasks", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("incidents", sa.Column("impacted_services", postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    return
    op.drop_column("incidents", "impacted_services")
    op.drop_column("incidents", "tasks")
    op.drop_column("incidents", "timeline_events")
    op.drop_column("incidents", "notes")
