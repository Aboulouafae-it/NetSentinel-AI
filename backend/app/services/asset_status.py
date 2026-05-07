"""
Deterministic asset monitoring status and risk helpers.

This keeps the MVP explainable: active alerts and last_seen drive the
monitoring state without hidden scoring models.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from app.models.alert import AlertSeverity, AlertStatus
from app.models.asset import AssetStatus


STALE_AFTER = timedelta(minutes=15)


@dataclass(frozen=True)
class AssetRiskResult:
    status: str
    risk_level: str
    reasons: list[str]


def _value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def calculate_asset_status(asset: Any, active_alerts: list[Any], now: datetime | None = None) -> AssetRiskResult:
    now = now or datetime.now(timezone.utc)
    reasons: list[str] = []
    explicit_status = _value(getattr(asset, "status", AssetStatus.UNKNOWN))
    last_seen = getattr(asset, "last_seen", None)

    open_alerts = [
        alert for alert in active_alerts
        if _value(getattr(alert, "status", "")) in {AlertStatus.OPEN.value, AlertStatus.ACKNOWLEDGED.value, "escalated"}
    ]
    severities = {_value(getattr(alert, "severity", "")) for alert in open_alerts}

    if explicit_status == AssetStatus.OFFLINE.value:
        reasons.append("Asset has explicit offline status.")
        return AssetRiskResult(status="offline", risk_level="offline", reasons=reasons)

    if last_seen is not None:
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        if now - last_seen > STALE_AFTER:
            reasons.append("Asset last_seen is stale.")
            return AssetRiskResult(status="offline", risk_level="offline", reasons=reasons)
    elif explicit_status == AssetStatus.UNKNOWN.value:
        reasons.append("No last_seen timestamp is available.")

    if AlertSeverity.CRITICAL.value in severities:
        reasons.append("Critical active alert is linked to this asset.")
        return AssetRiskResult(status="degraded", risk_level="at_risk", reasons=reasons)

    if {AlertSeverity.HIGH.value, AlertSeverity.MEDIUM.value} & severities:
        reasons.append("Medium or high active alert is linked to this asset.")
        return AssetRiskResult(status="degraded", risk_level="warning", reasons=reasons)

    if last_seen is not None:
        reasons.append("Asset was seen recently and has no active major alerts.")
        return AssetRiskResult(status="online", risk_level="normal", reasons=reasons)

    reasons.append("Insufficient monitoring data.")
    return AssetRiskResult(status=explicit_status if explicit_status != "degraded" else "unknown", risk_level="unknown", reasons=reasons)
