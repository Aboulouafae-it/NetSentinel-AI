"""v0.5 wireless radio snmp integration foundations

Revision ID: 20260507_0004
Revises: 20260507_0003
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260507_0004"
down_revision = "20260507_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Retained as historical revision marker. The public-alpha baseline
    # revision creates these polling, radio-link, and credential objects.
    return
    op.add_column("assets", sa.Column("last_poll_status", sa.String(length=50), nullable=True))
    op.add_column("assets", sa.Column("last_poll_latency_ms", sa.Float(), nullable=True))
    op.add_column("assets", sa.Column("last_poll_packet_loss_percent", sa.Float(), nullable=True))
    op.add_column("assets", sa.Column("last_poll_error", sa.Text(), nullable=True))
    op.add_column("assets", sa.Column("last_polled_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("radio_devices", sa.Column("wireless_link_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("radio_devices", sa.Column("is_online", sa.Boolean(), nullable=True))
    op.add_column("radio_devices", sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True))
    op.add_column("radio_devices", sa.Column("last_poll_latency_ms", sa.Float(), nullable=True))
    op.add_column("radio_devices", sa.Column("last_poll_error", sa.Text(), nullable=True))
    op.add_column("radio_devices", sa.Column("snmp_info", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index("ix_radio_devices_wireless_link_id", "radio_devices", ["wireless_link_id"])
    op.create_foreign_key("fk_radio_devices_wireless_link_id", "radio_devices", "wireless_links", ["wireless_link_id"], ["id"])

    op.add_column("wireless_links", sa.Column("near_end_radio_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("wireless_links", sa.Column("far_end_radio_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_wireless_links_near_end_radio_id", "wireless_links", "radio_devices", ["near_end_radio_id"], ["id"])
    op.create_foreign_key("fk_wireless_links_far_end_radio_id", "wireless_links", "radio_devices", ["far_end_radio_id"], ["id"])

    op.create_table(
        "credential_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("credential_type", sa.Enum("SNMP_V2C", "SNMP_V3", "API_TOKEN", "ROUTEROS", name="credentialtype"), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=True),
        sa.Column("secret_material", sa.Text(), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_credential_profiles_organization_id", "credential_profiles", ["organization_id"])


def downgrade() -> None:
    return
    op.drop_index("ix_credential_profiles_organization_id", table_name="credential_profiles")
    op.drop_table("credential_profiles")
    op.drop_constraint("fk_wireless_links_far_end_radio_id", "wireless_links", type_="foreignkey")
    op.drop_constraint("fk_wireless_links_near_end_radio_id", "wireless_links", type_="foreignkey")
    op.drop_column("wireless_links", "far_end_radio_id")
    op.drop_column("wireless_links", "near_end_radio_id")
    op.drop_constraint("fk_radio_devices_wireless_link_id", "radio_devices", type_="foreignkey")
    op.drop_index("ix_radio_devices_wireless_link_id", table_name="radio_devices")
    op.drop_column("radio_devices", "snmp_info")
    op.drop_column("radio_devices", "last_poll_error")
    op.drop_column("radio_devices", "last_poll_latency_ms")
    op.drop_column("radio_devices", "last_seen")
    op.drop_column("radio_devices", "is_online")
    op.drop_column("radio_devices", "wireless_link_id")
    op.drop_column("assets", "last_polled_at")
    op.drop_column("assets", "last_poll_error")
    op.drop_column("assets", "last_poll_packet_loss_percent")
    op.drop_column("assets", "last_poll_latency_ms")
    op.drop_column("assets", "last_poll_status")
