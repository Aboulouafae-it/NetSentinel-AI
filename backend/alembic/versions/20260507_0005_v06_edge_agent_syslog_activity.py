"""v0.6 edge agents syslog activity

Revision ID: 20260507_0005
Revises: 20260507_0004
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260507_0005"
down_revision = "20260507_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Retained as historical revision marker. The public-alpha baseline
    # revision creates edge agent, activity, and telemetry columns directly.
    return
    edge_status = sa.Enum("HEALTHY", "DEGRADED", "OFFLINE", "UNKNOWN", name="edgeagentstatus")
    activity_severity = sa.Enum("INFO", "WARNING", "ERROR", "CRITICAL", name="activityseverity")
    op.create_table(
        "edge_agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("agent_uid", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=100), nullable=True),
        sa.Column("hostname", sa.String(length=255), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("status", edge_status, nullable=False),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True),
        sa.Column("health_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_uid"),
    )
    op.create_index("ix_edge_agents_organization_id", "edge_agents", ["organization_id"])
    op.create_index("ix_edge_agents_agent_uid", "edge_agents", ["agent_uid"])

    op.create_table(
        "activity_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.String(length=255), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=255), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", activity_severity, nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_events_organization_id", "activity_events", ["organization_id"])
    op.add_column("assets", sa.Column("last_telemetry_source", sa.String(length=100), nullable=True))
    op.add_column("radio_devices", sa.Column("last_poll_source", sa.String(length=100), nullable=True))


def downgrade() -> None:
    return
    op.drop_column("radio_devices", "last_poll_source")
    op.drop_column("assets", "last_telemetry_source")
    op.drop_index("ix_activity_events_organization_id", table_name="activity_events")
    op.drop_table("activity_events")
    op.drop_index("ix_edge_agents_agent_uid", table_name="edge_agents")
    op.drop_index("ix_edge_agents_organization_id", table_name="edge_agents")
    op.drop_table("edge_agents")
