"""public alpha schema baseline

Revision ID: 20260507_0001
Revises:
Create Date: 2026-05-07

This revision is the v2.0.0-alpha clean-install baseline. Earlier private
iterations relied on FastAPI startup-time ``Base.metadata.create_all`` and then
ran migrations as deltas. That made a clean ``alembic upgrade head`` impossible.

For the public alpha, Alembic owns schema creation. This baseline creates the
current model metadata once; later historical delta migrations are retained in
the chain but made idempotent/no-op where their changes are already represented
here.
"""

from alembic import op

from app.models import Base  # imports all model tables/enums into metadata


revision = "20260507_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind, checkfirst=True)
