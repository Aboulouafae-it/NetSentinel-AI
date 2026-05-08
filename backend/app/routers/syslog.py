"""Authenticated HTTP syslog ingestion MVP."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.asset import Asset
from app.models.log import LogEntry, LogLevel
from app.models.site import Site
from app.routers.agents import authenticate_agent
from app.services.activity import create_activity_event
from app.services.syslog_profiles.fortinet import (
    build_fortinet_alert_payload,
    dedupe_key_for_fortinet,
    fortinet_to_log_level,
    looks_like_fortinet,
    normalize_fortinet_syslog,
    should_alert_fortinet,
)

router = APIRouter(prefix="/syslog", tags=["Syslog"])


class SyslogIngestRequest(BaseModel):
    source_ip: str
    hostname: str | None = None
    facility: str | None = None
    severity: str
    message: str
    timestamp: str | None = None
    agent_id: str | None = None
    raw: str | None = None


def syslog_level(severity: str) -> LogLevel:
    normalized = severity.lower()
    if normalized in {"0", "1", "2", "critical", "alert", "emergency"}:
        return LogLevel.CRITICAL
    if normalized in {"3", "error", "err"}:
        return LogLevel.ERROR
    if normalized in {"4", "warning", "warn"}:
        return LogLevel.WARNING
    return LogLevel.INFO


def classify_syslog_message(message: str) -> list[str]:
    text = message.lower()
    categories: list[str] = []
    failed_login_patterns = ["failed login", "login failure", "login failed", "failed password", "vpn login failed"]
    auth_patterns = ["authentication failure", "auth failure", "failed password", "login failure", "login failed"]
    if any(pattern in text for pattern in failed_login_patterns):
        categories.append("failed_login")
    if "interface down" in text or ("interface" in text and (" down" in text or "link down" in text)):
        categories.append("interface_down")
    if "rogue ap" in text or "rogue access point" in text:
        categories.append("rogue_ap")
    if "link down" in text or "peer disconnected" in text:
        categories.append("link_down")
    if any(pattern in text for pattern in auth_patterns):
        categories.append("authentication_failure")
    if any(pattern in text for pattern in ["blocked traffic", "traffic blocked", "traffic denied", "action=deny", "action=blocked", "deny policy"]):
        categories.append("blocked_traffic")
    return categories


def should_alert(message: str, level: LogLevel) -> bool:
    return level in {LogLevel.CRITICAL, LogLevel.ERROR} or bool(classify_syslog_message(message))


def fortinet_activity_severity(category: str, level: LogLevel) -> str:
    if category in {"malware_detected", "ha_failover", "ips_attack_detected"}:
        return "critical"
    if category in {"admin_login_failure", "vpn_login_failure", "interface_down", "config_changed"}:
        return "warning"
    return "warning" if level in {LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL} else "info"


def important_fortinet_activity(category: str) -> bool:
    return category in {
        "vpn_login_failure",
        "admin_login_failure",
        "ips_attack_detected",
        "malware_detected",
        "ha_failover",
        "interface_down",
        "config_changed",
    }


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_syslog(
    data: SyslogIngestRequest,
    db: AsyncSession = Depends(get_db),
    x_agent_uid: str | None = Header(default=None),
    x_agent_token: str | None = Header(default=None),
):
    agent = await authenticate_agent(db, x_agent_uid or data.agent_id, x_agent_token)
    timestamp = datetime.now(timezone.utc)
    if data.timestamp:
        timestamp = datetime.fromisoformat(data.timestamp.replace("Z", "+00:00"))
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
    fortinet_event = normalize_fortinet_syslog(data.message) if looks_like_fortinet(data.message) else None
    asset_ips = {data.source_ip}
    asset_names = {data.hostname} if data.hostname else set()
    if fortinet_event:
        parsed = fortinet_event.parsed
        asset_ips.update(value for value in [parsed.get("srcip"), parsed.get("dstip")] if value)
        asset_names.update(value for value in [parsed.get("devname")] if value)
    asset = await db.scalar(
        select(Asset)
        .join(Site, Asset.site_id == Site.id)
        .where(
            Site.organization_id == agent.organization_id,
            or_(Asset.ip_address.in_(asset_ips), Asset.hostname.in_(asset_names)),
        )
    )
    level = syslog_level(data.severity)
    if fortinet_event:
        level = fortinet_to_log_level(fortinet_event.classification)
    classifications = classify_syslog_message(data.message)
    if fortinet_event and fortinet_event.classification.category not in classifications:
        classifications.append(fortinet_event.classification.category)
    metadata = {
        "facility": data.facility,
        "source_ip": data.source_ip,
        "hostname": data.hostname,
        "raw": data.raw,
        "agent_id": str(agent.id),
        "classifications": classifications,
    }
    if fortinet_event:
        metadata.update({
            "vendor_profile": "fortinet",
            "normalized": fortinet_event.as_dict(),
            "category": fortinet_event.classification.category,
            "severity": fortinet_event.classification.severity,
            "recommended_action": fortinet_event.classification.recommended_action,
            "alert_created": False,
            "unlinked_source": asset is None,
        })
    log = LogEntry(
        timestamp=timestamp,
        level=level,
        source="fortinet_syslog" if fortinet_event else "syslog",
        message=data.message,
        metadata_json=metadata,
        asset_id=asset.id if asset else None,
        organization_id=agent.organization_id,
    )
    db.add(log)
    await db.flush()
    activity_message = f"Fortinet {fortinet_event.classification.category}: {fortinet_event.classification.summary[:100]}" if fortinet_event else f"Syslog: {data.message[:120]}"
    await create_activity_event(db, agent.organization_id, "syslog_ingested", "log", activity_message, actor_type="agent", actor_id=str(agent.id), entity_id=str(log.id), severity=fortinet_activity_severity(fortinet_event.classification.category, level) if fortinet_event else "warning" if level in {LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL} else "info")
    if fortinet_event and important_fortinet_activity(fortinet_event.classification.category):
        await create_activity_event(db, agent.organization_id, f"fortinet_{fortinet_event.classification.category}", "log", fortinet_event.classification.summary[:255], actor_type="agent", actor_id=str(agent.id), entity_id=str(log.id), severity=fortinet_activity_severity(fortinet_event.classification.category, level))
    if fortinet_event:
        should_create_alert = should_alert_fortinet(fortinet_event)
        dedupe_key = dedupe_key_for_fortinet(agent.organization_id, fortinet_event)
    else:
        should_create_alert = should_alert(data.message, level)
        dedupe_key = f"syslog:{agent.organization_id}:{data.source_ip}:{data.message[:80].lower()}"
    if should_create_alert:
        existing = await db.scalar(select(Alert).where(Alert.dedupe_key == dedupe_key, Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED])))
        if existing:
            existing.occurrence_count += 1
            existing.last_seen = timestamp
            existing.source_metadata = existing.source_metadata or {}
            evidence = existing.source_metadata.setdefault("evidence", [])
            if fortinet_event:
                evidence.append(build_fortinet_alert_payload(fortinet_event)["source_metadata"]["evidence"][0])
        else:
            fortinet_payload = build_fortinet_alert_payload(fortinet_event) if fortinet_event else None
            alert = Alert(
                title=fortinet_payload["title"] if fortinet_payload else f"Syslog event: {data.message[:80]}",
                description=fortinet_payload["description"] if fortinet_payload else data.raw or data.message,
                severity=fortinet_payload["severity"] if fortinet_payload else AlertSeverity.HIGH if level != LogLevel.CRITICAL else AlertSeverity.CRITICAL,
                status=AlertStatus.OPEN,
                source=fortinet_payload["source"] if fortinet_payload else "Syslog",
                rule_name=fortinet_payload["rule_name"] if fortinet_payload else "syslog_pattern",
                source_metadata=fortinet_payload["source_metadata"] if fortinet_payload else None,
                organization_id=agent.organization_id,
                asset_id=asset.id if asset else None,
                dedupe_key=dedupe_key,
                occurrence_count=1,
                last_seen=timestamp,
            )
            db.add(alert)
            await db.flush()
            if fortinet_event:
                log.metadata_json["alert_created"] = True
                log.metadata_json["alert_id"] = str(alert.id)
            await create_activity_event(db, agent.organization_id, "alert_created", "alert", f"Alert created from syslog: {alert.title}", actor_type="agent", actor_id=str(agent.id), entity_id=str(alert.id), severity="warning")
    return {"status": "stored", "log_id": str(log.id), "asset_id": str(asset.id) if asset else None}
