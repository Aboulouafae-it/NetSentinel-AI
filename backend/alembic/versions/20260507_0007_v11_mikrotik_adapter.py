"""v1.1 mikrotik adapter enum value

Revision ID: 20260507_0007
Revises: 20260507_0006
Create Date: 2026-05-07
"""

from alembic import op


revision = "20260507_0007"
down_revision = "20260507_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE adaptertype ADD VALUE IF NOT EXISTS 'MIKROTIK_ROUTEROS'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be dropped safely without recreating the type.
    pass
