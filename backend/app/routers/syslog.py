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
    asset = await db.scalar(
        select(Asset)
        .join(Site, Asset.site_id == Site.id)
        .where(
            Site.organization_id == agent.organization_id,
            or_(Asset.ip_address == data.source_ip, Asset.hostname == data.hostname),
        )
    )
    level = syslog_level(data.severity)
    log = LogEntry(
        timestamp=timestamp,
        level=level,
        source="syslog",
        message=data.message,
        metadata_json={"facility": data.facility, "source_ip": data.source_ip, "hostname": data.hostname, "raw": data.raw, "agent_id": str(agent.id), "classifications": classify_syslog_message(data.message)},
        asset_id=asset.id if asset else None,
        organization_id=agent.organization_id,
    )
    db.add(log)
    await db.flush()
    await create_activity_event(db, agent.organization_id, "syslog_ingested", "log", f"Syslog: {data.message[:120]}", actor_type="agent", actor_id=str(agent.id), entity_id=str(log.id), severity="warning" if level in {LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL} else "info")
    if should_alert(data.message, level):
        dedupe_key = f"syslog:{agent.organization_id}:{data.source_ip}:{data.message[:80].lower()}"
        existing = await db.scalar(select(Alert).where(Alert.dedupe_key == dedupe_key, Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED])))
        if existing:
            existing.occurrence_count += 1
            existing.last_seen = timestamp
        else:
            alert = Alert(
                title=f"Syslog event: {data.message[:80]}",
                description=data.raw or data.message,
                severity=AlertSeverity.HIGH if level != LogLevel.CRITICAL else AlertSeverity.CRITICAL,
                status=AlertStatus.OPEN,
                source="Syslog",
                rule_name="syslog_pattern",
                organization_id=agent.organization_id,
                asset_id=asset.id if asset else None,
                dedupe_key=dedupe_key,
                occurrence_count=1,
                last_seen=timestamp,
            )
            db.add(alert)
            await db.flush()
            await create_activity_event(db, agent.organization_id, "alert_created", "alert", f"Alert created from syslog: {alert.title}", actor_type="agent", actor_id=str(agent.id), entity_id=str(alert.id), severity="warning")
    return {"status": "stored", "log_id": str(log.id), "asset_id": str(asset.id) if asset else None}
