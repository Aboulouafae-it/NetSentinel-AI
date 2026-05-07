"""v1.2 tplink adapter enum value

Revision ID: 20260507_0008
Revises: 20260507_0007
Create Date: 2026-05-07
"""

from alembic import op


revision = "20260507_0008"
down_revision = "20260507_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE adaptertype ADD VALUE IF NOT EXISTS 'TPLINK_CPE'")


def downgrade() -> None:
    pass
