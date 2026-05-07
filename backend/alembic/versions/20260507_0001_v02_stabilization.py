"""v0.2 stabilization foundations

Revision ID: 20260507_0001
Revises:
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260507_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("field_measurements", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("field_measurements", sa.Column("wireless_link_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_field_measurements_organization_id", "field_measurements", ["organization_id"])
    op.create_index("ix_field_measurements_wireless_link_id", "field_measurements", ["wireless_link_id"])
    op.create_foreign_key("fk_field_measurements_organization_id", "field_measurements", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_field_measurements_wireless_link_id", "field_measurements", "wireless_links", ["wireless_link_id"], ["id"])

    op.add_column("alerts", sa.Column("source_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("alerts", sa.Column("dedupe_key", sa.String(length=500), nullable=True))
    op.add_column("alerts", sa.Column("occurrence_count", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("alerts", sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_alerts_dedupe_key", "alerts", ["dedupe_key"])
    op.alter_column("alerts", "occurrence_count", server_default=None)

    op.add_column("radio_devices", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_radio_devices_organization_id", "radio_devices", ["organization_id"])
    op.create_foreign_key("fk_radio_devices_organization_id", "radio_devices", "organizations", ["organization_id"], ["id"])

    op.add_column("discovery_scans", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_discovery_scans_organization_id", "discovery_scans", ["organization_id"])
    op.create_foreign_key("fk_discovery_scans_organization_id", "discovery_scans", "organizations", ["organization_id"], ["id"])

    op.add_column("discovered_hosts", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_discovered_hosts_organization_id", "discovered_hosts", ["organization_id"])
    op.create_foreign_key("fk_discovered_hosts_organization_id", "discovered_hosts", "organizations", ["organization_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_discovered_hosts_organization_id", "discovered_hosts", type_="foreignkey")
    op.drop_index("ix_discovered_hosts_organization_id", table_name="discovered_hosts")
    op.drop_column("discovered_hosts", "organization_id")

    op.drop_constraint("fk_discovery_scans_organization_id", "discovery_scans", type_="foreignkey")
    op.drop_index("ix_discovery_scans_organization_id", table_name="discovery_scans")
    op.drop_column("discovery_scans", "organization_id")

    op.drop_constraint("fk_radio_devices_organization_id", "radio_devices", type_="foreignkey")
    op.drop_index("ix_radio_devices_organization_id", table_name="radio_devices")
    op.drop_column("radio_devices", "organization_id")

    op.drop_index("ix_alerts_dedupe_key", table_name="alerts")
    op.drop_column("alerts", "last_seen")
    op.drop_column("alerts", "occurrence_count")
    op.drop_column("alerts", "dedupe_key")
    op.drop_column("alerts", "source_metadata")

    op.drop_constraint("fk_field_measurements_wireless_link_id", "field_measurements", type_="foreignkey")
    op.drop_constraint("fk_field_measurements_organization_id", "field_measurements", type_="foreignkey")
    op.drop_index("ix_field_measurements_wireless_link_id", table_name="field_measurements")
    op.drop_index("ix_field_measurements_organization_id", table_name="field_measurements")
    op.drop_column("field_measurements", "wireless_link_id")
    op.drop_column("field_measurements", "organization_id")
