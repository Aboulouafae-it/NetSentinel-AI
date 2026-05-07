"""Pure dashboard aggregation helpers used by API and tests."""

from collections import Counter
from datetime import datetime, timezone
from typing import Any

from app.models.alert import AlertSeverity, AlertStatus
from app.models.incident import IncidentStatus
from app.services.asset_status import calculate_asset_status


def value(item: Any) -> str:
    return item.value if hasattr(item, "value") else str(item)


def summarize_dashboard_counts(
    assets: list[Any],
    alerts: list[Any],
    incidents: list[Any],
    wireless_links_count: int,
    radio_devices_count: int,
) -> dict:
    active_alerts = [
        alert for alert in alerts
        if value(getattr(alert, "status", "")) in {
            AlertStatus.OPEN.value,
            AlertStatus.ACKNOWLEDGED.value,
            AlertStatus.ESCALATED.value,
        }
    ]
    alert_counts = Counter(value(getattr(alert, "severity", "")) for alert in alerts)
    incident_counts = Counter(value(getattr(incident, "status", "")) for incident in incidents)

    asset_results = [
        calculate_asset_status(asset, [alert for alert in active_alerts if getattr(alert, "asset_id", None) == getattr(asset, "id", None)])
        for asset in assets
    ]
    asset_counts = Counter(result.status for result in asset_results)
    risk_counts = Counter(result.risk_level for result in asset_results)
    active_incidents = sum(
        1 for incident in incidents
        if value(getattr(incident, "status", "")) not in {IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value}
    )

    return {
        "assets": {
            "total": len(assets),
            "online": asset_counts.get("online", 0),
            "offline": asset_counts.get("offline", 0),
            "warning": risk_counts.get("warning", 0) + risk_counts.get("at_risk", 0),
            "unmanaged": risk_counts.get("unknown", 0),
        },
        "alerts": {
            "open": sum(1 for alert in alerts if value(getattr(alert, "status", "")) == AlertStatus.OPEN.value),
            "critical": alert_counts.get(AlertSeverity.CRITICAL.value, 0),
            "high": alert_counts.get(AlertSeverity.HIGH.value, 0),
            "medium": alert_counts.get(AlertSeverity.MEDIUM.value, 0),
            "low": alert_counts.get(AlertSeverity.LOW.value, 0),
        },
        "incidents": {
            "active": active_incidents,
            "by_status": dict(incident_counts),
        },
        "wireless_links": {"total": wireless_links_count},
        "radio_devices": {"total": radio_devices_count},
    }


def sort_recent_activity(activities: list[dict], limit: int) -> list[dict]:
    def parse_ts(item):
        timestamp = item.get("timestamp")
        if isinstance(timestamp, datetime):
            return timestamp
        try:
            parsed = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    return sorted(activities, key=parse_ts, reverse=True)[:limit]
