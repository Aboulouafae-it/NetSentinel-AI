"""v0.4 dashboard and asset monitoring

Revision ID: 20260507_0003
Revises: 20260507_0002
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260507_0003"
down_revision = "20260507_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Retained as historical revision marker. The public-alpha baseline
    # revision creates assets.last_seen directly.
    return
    op.add_column("assets", sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    return
    op.drop_column("assets", "last_seen")
