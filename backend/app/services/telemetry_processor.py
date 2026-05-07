"""Telemetry processing helpers."""

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.asset import Asset, AssetStatus
from app.models.site import Site
from app.services.activity import create_activity_event


async def find_asset_for_telemetry(db: AsyncSession, organization_id, asset_id: str | None, ip_address: str | None) -> Asset | None:
    if asset_id:
        asset = await db.scalar(select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id == asset_id, Site.organization_id == organization_id))
        if asset:
            return asset
    if ip_address:
        return await db.scalar(select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.ip_address == ip_address, Site.organization_id == organization_id))
    return None


async def upsert_asset_down_alert(db: AsyncSession, organization_id, asset: Asset) -> Alert:
    dedupe_key = f"telemetry_down:{asset.id}"
    existing = await db.scalar(select(Alert).where(Alert.dedupe_key == dedupe_key, Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED])))
    if existing:
        existing.occurrence_count += 1
        existing.last_seen = datetime.now(timezone.utc)
        return existing
    alert = Alert(
        title=f"Telemetry reports asset down: {asset.hostname}",
        description="Edge telemetry reported this asset as down or unreachable.",
        severity=AlertSeverity.HIGH,
        status=AlertStatus.OPEN,
        source="EdgeTelemetry",
        rule_name="asset_down",
        organization_id=organization_id,
        asset_id=asset.id,
        dedupe_key=dedupe_key,
        occurrence_count=1,
        last_seen=datetime.now(timezone.utc),
    )
    db.add(alert)
    await db.flush()
    return alert


async def process_asset_telemetry(db: AsyncSession, organization_id, payload, actor_id: str | None = None) -> Asset | None:
    asset = await find_asset_for_telemetry(db, organization_id, getattr(payload, "asset_id", None), getattr(payload, "ip_address", None))
    if not asset:
        return None
    timestamp = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00")) if getattr(payload, "timestamp", None) else datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)
    metric_type = getattr(payload, "metric_type", "")
    value = getattr(payload, "value", None)
    asset.last_seen = timestamp
    asset.last_polled_at = timestamp
    asset.last_poll_status = "telemetry"
    asset.last_telemetry_source = f"agent:{actor_id}" if actor_id else "telemetry"
    if metric_type in {"latency", "latency_ms"}:
        asset.last_poll_latency_ms = float(value)
    if metric_type in {"packet_loss", "packet_loss_percent"}:
        asset.last_poll_packet_loss_percent = float(value)
    if metric_type in {"status", "reachability"}:
        is_down = str(value).lower() in {"0", "down", "offline", "false"}
        asset.status = AssetStatus.OFFLINE if is_down else AssetStatus.ONLINE
        if is_down:
            await upsert_asset_down_alert(db, organization_id, asset)
    else:
        asset.status = AssetStatus.ONLINE
    await create_activity_event(db, organization_id, "telemetry_ingested", "asset", f"Telemetry updated asset {asset.hostname}", actor_type="agent", actor_id=actor_id, entity_id=str(asset.id), metadata={"metric_type": metric_type})
    await db.flush()
    return asset
