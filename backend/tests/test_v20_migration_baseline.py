from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from app.schemas.asset import AssetResponse
from app.schemas.site import SiteResponse


ROOT = Path(__file__).resolve().parents[2]


def test_public_alpha_initial_revision_is_schema_baseline():
    migration = ROOT / "backend" / "alembic" / "versions" / "20260507_0001_v02_stabilization.py"
    source = migration.read_text()

    assert "public alpha schema baseline" in source.lower()
    assert "Base.metadata.create_all" in source
    assert "field_measurements" not in source.split("def upgrade", 1)[1].split("def downgrade", 1)[0]


def test_historical_delta_migrations_do_not_duplicate_baseline_columns():
    for name in [
        "20260507_0002_v03_alert_incident_workflow.py",
        "20260507_0003_v04_dashboard_asset_monitoring.py",
        "20260507_0004_v05_wireless_radio_snmp.py",
        "20260507_0005_v06_edge_agent_syslog_activity.py",
        "20260507_0006_v09_vendor_adapters.py",
    ]:
        source = (ROOT / "backend" / "alembic" / "versions" / name).read_text()
        upgrade_body = source.split("def upgrade", 1)[1].split("def downgrade", 1)[0]
        assert "return" in upgrade_body
        assert "Retained as historical revision marker" in source


def test_app_startup_does_not_create_schema():
    source = (ROOT / "backend" / "app" / "main.py").read_text()

    assert "Base.metadata.create_all" not in source


def test_clean_migration_validation_script_exists_and_checks_key_schema():
    script = ROOT / "scripts" / "validate_clean_migrations.sh"
    source = script.read_text()

    assert script.exists()
    assert script.stat().st_mode & 0o111
    assert "field_measurements" in source
    assert "assets_last_seen" in source
    assert "20260507_0009" in source
    assert "docker run" in source


def test_stale_database_recovery_is_documented():
    doc = (ROOT / "docs" / "DB_MIGRATION_RECOVERY.md").read_text().lower()

    for phrase in [
        "back up before",
        "alembic_version",
        "assets.last_seen",
        "field_measurements",
        "when stamping is safe",
        "do not stamp",
        "never delete postgresql volumes casually",
    ]:
        assert phrase in doc


def test_site_response_accepts_uuid_backed_model_fields():
    now = datetime.now(timezone.utc)
    site = SimpleNamespace(
        id=uuid4(),
        name="RC2 Site",
        location=None,
        description=None,
        subnet=None,
        organization_id=uuid4(),
        created_at=now,
        updated_at=now,
    )

    response = SiteResponse.model_validate(site)

    assert response.id == site.id
    assert response.organization_id == site.organization_id


def test_asset_response_accepts_uuid_backed_model_fields():
    now = datetime.now(timezone.utc)
    asset = SimpleNamespace(
        id=uuid4(),
        hostname="rc2-asset",
        ip_address="127.0.0.1",
        mac_address=None,
        asset_type="firewall",
        status="unknown",
        os_info=None,
        vendor="Fortinet",
        description=None,
        last_seen=None,
        site_id=uuid4(),
        risk_level="unknown",
        risk_reasons=[],
        related_alerts_count=0,
        last_poll_status=None,
        last_telemetry_source=None,
        last_poll_latency_ms=None,
        last_poll_packet_loss_percent=None,
        last_poll_error=None,
        last_polled_at=None,
        created_at=now,
        updated_at=now,
    )

    response = AssetResponse.model_validate(asset)

    assert response.id == asset.id
    assert response.site_id == asset.site_id
