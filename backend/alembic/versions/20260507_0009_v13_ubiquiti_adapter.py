"""v1.3 ubiquiti adapter enum value

Revision ID: 20260507_0009
Revises: 20260507_0008
Create Date: 2026-05-07
"""

from alembic import op


revision = "20260507_0009"
down_revision = "20260507_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE adaptertype ADD VALUE IF NOT EXISTS 'UBIQUITI_AIRMAX'")


def downgrade() -> None:
    pass
