from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

from app.models.alert import AlertSeverity, AlertStatus
from app.models.asset import AssetStatus
from app.models.incident import IncidentStatus
from app.services.dashboard_metrics import sort_recent_activity, summarize_dashboard_counts


def test_dashboard_summary_counts_scoped_records_only():
    asset_id = uuid4()
    assets = [SimpleNamespace(id=asset_id, status=AssetStatus.ONLINE, last_seen=datetime.now(timezone.utc))]
    alerts = [
        SimpleNamespace(asset_id=asset_id, severity=AlertSeverity.CRITICAL, status=AlertStatus.OPEN),
        SimpleNamespace(asset_id=None, severity=AlertSeverity.LOW, status=AlertStatus.RESOLVED),
    ]
    incidents = [
        SimpleNamespace(status=IncidentStatus.OPEN),
        SimpleNamespace(status=IncidentStatus.RESOLVED),
    ]

    summary = summarize_dashboard_counts(assets, alerts, incidents, wireless_links_count=3, radio_devices_count=2)

    assert summary["assets"]["total"] == 1
    assert summary["assets"]["warning"] == 1
    assert summary["alerts"]["open"] == 1
    assert summary["alerts"]["critical"] == 1
    assert summary["incidents"]["active"] == 1
    assert summary["wireless_links"]["total"] == 3
    assert summary["radio_devices"]["total"] == 2


def test_recent_activity_sorting_limits_newest_events():
    now = datetime.now(timezone.utc)
    activities = [
        {"title": "old", "timestamp": now - timedelta(hours=1)},
        {"title": "new", "timestamp": now},
        {"title": "middle", "timestamp": (now - timedelta(minutes=5)).isoformat()},
    ]

    result = sort_recent_activity(activities, limit=2)

    assert [item["title"] for item in result] == ["new", "middle"]
