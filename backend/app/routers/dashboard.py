"""
NetSentinel AI — Operations Dashboard Router
"""

from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.alert import Alert, AlertStatus
from app.models.asset import Asset
from app.models.edge_agent import ActivityEvent, EdgeAgent, EdgeAgentStatus
from app.models.field_measurement import FieldMeasurement
from app.models.incident import Incident
from app.models.log import LogEntry
from app.models.radio_device import RadioDevice
from app.models.site import Site
from app.models.user import User
from app.models.wireless import WirelessLink
from app.services.dashboard_metrics import sort_recent_activity, summarize_dashboard_counts

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


async def scoped_assets(db: AsyncSession, org_id):
    result = await db.execute(
        select(Asset)
        .join(Site, Asset.site_id == Site.id)
        .where(Site.organization_id == org_id)
        .order_by(Asset.hostname)
    )
    return result.scalars().all()


async def scoped_alerts(db: AsyncSession, org_id):
    result = await db.execute(select(Alert).where(Alert.organization_id == org_id))
    return result.scalars().all()


@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    assets = await scoped_assets(db, org_id)
    alerts = await scoped_alerts(db, org_id)
    incidents = (await db.execute(select(Incident).where(Incident.organization_id == org_id))).scalars().all()
    links_count = await db.scalar(select(func.count()).select_from(WirelessLink).where(WirelessLink.organization_id == org_id))
    radio_count = await db.scalar(select(func.count()).select_from(RadioDevice).where(RadioDevice.organization_id == org_id))
    radios = (await db.execute(select(RadioDevice).where(RadioDevice.organization_id == org_id))).scalars().all()
    recent_logs = (await db.execute(select(LogEntry).where(LogEntry.organization_id == org_id).order_by(LogEntry.timestamp.desc()).limit(500))).scalars().all()
    fortinet_logs = [log for log in recent_logs if (log.metadata_json or {}).get("vendor_profile") == "fortinet"]
    fortinet_categories = Counter((log.metadata_json or {}).get("category") for log in fortinet_logs)

    summary = summarize_dashboard_counts(assets, alerts, incidents, links_count or 0, radio_count or 0)
    summary["radio_devices"].update({
        "live_adapter_supported": sum(1 for radio in radios if (radio.adapter_capabilities or {}).get("configured") and (radio.adapter_capabilities or {}).get("supports_interfaces")),
        "missing_credentials": sum(1 for radio in radios if "credential" in " ".join((radio.adapter_capabilities or {}).get("missing_requirements", []))),
        "missing_metrics": sum(1 for radio in radios if (radio.latest_wireless_metrics or {}).get("snapshot", {}).get("missing_fields")),
    })
    summary["security_events"] = {
        "fortinet_high_severity": sum(1 for log in fortinet_logs if (log.metadata_json or {}).get("severity") in {"critical", "high"}),
        "vpn_failures": fortinet_categories.get("vpn_login_failure", 0),
        "ips_malware": fortinet_categories.get("ips_attack_detected", 0) + fortinet_categories.get("malware_detected", 0),
        "blocked_traffic": fortinet_categories.get("firewall_blocked_traffic", 0),
    }
    return summary


@router.get("/wireless-health")
async def dashboard_wireless_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FieldMeasurement).where(FieldMeasurement.organization_id == current_user.organization_id)
    )
    measurements = result.scalars().all()

    def avg(values):
        values = [value for value in values if value is not None]
        return round(sum(values) / len(values), 2) if values else None

    return {
        "measurements": len(measurements),
        "avg_rssi": avg([m.rssi_dbm for m in measurements]),
        "avg_snr": avg([m.snr_db for m in measurements]),
        "avg_noise_floor": avg([m.noise_floor_dbm for m in measurements]),
        "avg_latency": avg([m.latency_ms for m in measurements]),
        "avg_packet_loss": avg([m.packet_loss_percent for m in measurements]),
    }


@router.get("/recent-activity")
async def dashboard_recent_activity(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    event_rows = (await db.execute(select(ActivityEvent).where(ActivityEvent.organization_id == org_id).order_by(ActivityEvent.created_at.desc()).limit(limit))).scalars().all()
    if event_rows:
        return [
            {
                "type": event.entity_type,
                "event": event.event_type,
                "title": event.message,
                "actor": event.actor_type,
                "severity": event.severity.value if hasattr(event.severity, "value") else event.severity,
                "timestamp": event.created_at,
            }
            for event in event_rows
        ]
    activities: list[dict] = []

    alerts = (await db.execute(select(Alert).where(Alert.organization_id == org_id).order_by(Alert.created_at.desc()).limit(limit))).scalars().all()
    for alert in alerts:
        activities.append({
            "type": "alert",
            "event": "created",
            "title": alert.title,
            "severity": alert.severity.value if hasattr(alert.severity, "value") else alert.severity,
            "timestamp": alert.created_at,
        })
        for event in (alert.source_metadata or {}).get("lifecycle_history", [])[-3:]:
            activities.append({
                "type": "alert",
                "event": event.get("event_type"),
                "title": alert.title,
                "actor": event.get("user_name"),
                "timestamp": event.get("timestamp"),
            })

    incidents = (await db.execute(select(Incident).where(Incident.organization_id == org_id).order_by(Incident.created_at.desc()).limit(limit))).scalars().all()
    for incident in incidents:
        activities.append({"type": "incident", "event": "created", "title": incident.title, "timestamp": incident.created_at})
        for event in (incident.timeline_events or [])[-5:]:
            activities.append({
                "type": "incident",
                "event": event.get("event_type"),
                "title": incident.title,
                "actor": event.get("user_name"),
                "timestamp": event.get("timestamp"),
            })

    measurements = (await db.execute(select(FieldMeasurement).where(FieldMeasurement.organization_id == org_id).order_by(FieldMeasurement.created_at.desc()).limit(limit))).scalars().all()
    for measurement in measurements:
        activities.append({"type": "field_measurement", "event": "saved", "title": measurement.link_name, "timestamp": measurement.created_at})

    logs = (await db.execute(select(LogEntry).where(LogEntry.organization_id == org_id).order_by(LogEntry.timestamp.desc()).limit(limit))).scalars().all()
    for log in logs:
        activities.append({"type": "log", "event": log.level.value if hasattr(log.level, "value") else log.level, "title": log.message, "timestamp": log.timestamp})

    assets = await scoped_assets(db, org_id)
    for asset in [asset for asset in assets if asset.last_polled_at][:limit]:
        activities.append({
            "type": "asset",
            "event": asset.last_poll_status or "polled",
            "title": asset.hostname,
            "timestamp": asset.last_polled_at,
        })

    return sort_recent_activity(activities, limit)


@router.get("/system-status")
async def dashboard_system_status(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    agents = (await db.execute(select(EdgeAgent).where(EdgeAgent.organization_id == current_user.organization_id))).scalars().all()
    healthy = sum(1 for agent in agents if agent.status == EdgeAgentStatus.HEALTHY)
    return {
        "api": {"status": "operational"},
        "database": {"status": "connected"},
        "auth": {"status": "operational"},
        "telemetry": {"status": "authenticated_ingestion_enabled"},
        "snmp_adapter": {"status": "generic_snmp_supported"},
        "edge_agents": {"status": f"{healthy}/{len(agents)} healthy"},
    }


@router.get("/topology-summary")
async def dashboard_topology_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id
    sites = (await db.execute(select(Site).where(Site.organization_id == org_id).order_by(Site.name))).scalars().all()
    assets = await scoped_assets(db, org_id)
    alerts = await scoped_alerts(db, org_id)
    links = (await db.execute(select(WirelessLink).where(WirelessLink.organization_id == org_id).order_by(WirelessLink.name))).scalars().all()
    active_alert_asset_ids = {str(alert.asset_id) for alert in alerts if alert.asset_id and alert.status in {AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED}}
    active_alert_link_ids = {str(alert.wireless_link_id) for alert in alerts if alert.wireless_link_id and alert.status in {AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED}}

    assets_by_site = Counter(str(asset.site_id) for asset in assets)
    return {
        "sites": [
            {
                "id": str(site.id),
                "name": site.name,
                "assets_count": assets_by_site.get(str(site.id), 0),
                "has_active_alerts": any(str(asset.id) in active_alert_asset_ids for asset in assets if str(asset.site_id) == str(site.id)),
            }
            for site in sites
        ],
        "wireless_links": [
            {
                "id": str(link.id),
                "name": link.name,
                "status": link.status.value if hasattr(link.status, "value") else link.status,
                "has_active_alerts": str(link.id) in active_alert_link_ids,
            }
            for link in links
        ],
    }
