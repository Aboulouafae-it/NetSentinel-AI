from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.models.alert import AlertSeverity, AlertStatus
from app.models.asset import AssetStatus
from app.services.asset_status import calculate_asset_status


def asset(status=AssetStatus.UNKNOWN, last_seen=None):
    return SimpleNamespace(id=uuid4(), status=status, last_seen=last_seen)


def alert(asset_id, severity=AlertSeverity.HIGH, status=AlertStatus.OPEN):
    return SimpleNamespace(asset_id=asset_id, severity=severity, status=status)


def test_asset_online_when_recently_seen_and_no_major_alerts():
    now = datetime.now(timezone.utc)
    current_asset = asset(status=AssetStatus.ONLINE, last_seen=now)

    result = calculate_asset_status(current_asset, [], now=now)

    assert result.status == "online"
    assert result.risk_level == "normal"


def test_asset_at_risk_when_critical_alert_exists():
    now = datetime.now(timezone.utc)
    current_asset = asset(status=AssetStatus.ONLINE, last_seen=now)

    result = calculate_asset_status(current_asset, [alert(current_asset.id, AlertSeverity.CRITICAL)], now=now)

    assert result.status == "degraded"
    assert result.risk_level == "at_risk"


def test_asset_offline_when_last_seen_is_stale():
    now = datetime.now(timezone.utc)
    current_asset = asset(status=AssetStatus.ONLINE, last_seen=now - timedelta(minutes=30))

    result = calculate_asset_status(current_asset, [], now=now)

    assert result.status == "offline"
    assert result.risk_level == "offline"
