"""Asset and radio polling orchestration."""

from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.asset import Asset, AssetStatus
from app.models.credential import CredentialProfile
from app.models.radio_device import RadioDevice
from app.services.reachability import check_reachability
from app.services.activity import create_activity_event
from app.services.outdoor_radio import outdoor_profile_for_radio
from app.services.vendor_adapters import diagnose_wireless_snapshot, select_adapter


async def upsert_offline_alert(db: AsyncSession, organization_id, title: str, source: str, asset_id=None, radio_id=None) -> Alert:
    dedupe_key = f"polling_offline:{source}:{asset_id or radio_id}"
    existing = await db.scalar(select(Alert).where(Alert.dedupe_key == dedupe_key, Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED])))
    if existing:
        existing.occurrence_count += 1
        existing.last_seen = datetime.now(timezone.utc)
        return existing
    alert = Alert(
        title=title,
        description="Polling could not reach the device within the configured timeout.",
        severity=AlertSeverity.HIGH,
        status=AlertStatus.OPEN,
        source="Polling",
        rule_name="device_reachability",
        organization_id=organization_id,
        asset_id=asset_id,
        dedupe_key=dedupe_key,
        occurrence_count=1,
        last_seen=datetime.now(timezone.utc),
        source_metadata={"source": source, "radio_device_id": str(radio_id) if radio_id else None},
    )
    db.add(alert)
    await db.flush()
    return alert


async def upsert_radio_adapter_alert(db: AsyncSession, organization_id, radio_id, title: str, rule_name: str, severity: AlertSeverity = AlertSeverity.HIGH, metadata: dict | None = None) -> Alert:
    dedupe_key = f"radio_adapter:{rule_name}:{radio_id}"
    existing = await db.scalar(select(Alert).where(Alert.dedupe_key == dedupe_key, Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED])))
    if existing:
        existing.occurrence_count += 1
        existing.last_seen = datetime.now(timezone.utc)
        existing.source_metadata = metadata or existing.source_metadata
        return existing
    alert = Alert(
        title=title,
        description="Radio adapter polling reported a device or wireless health issue.",
        severity=severity,
        status=AlertStatus.OPEN,
        source="RadioAdapter",
        rule_name=rule_name,
        organization_id=organization_id,
        dedupe_key=dedupe_key,
        occurrence_count=1,
        last_seen=datetime.now(timezone.utc),
        source_metadata=metadata or {},
    )
    db.add(alert)
    await db.flush()
    return alert


async def poll_asset(db: AsyncSession, asset: Asset, organization_id) -> dict:
    result = await check_reachability(asset.ip_address or "")
    asset.last_polled_at = result.checked_at
    asset.last_poll_latency_ms = result.latency_ms
    asset.last_poll_packet_loss_percent = result.packet_loss_percent
    asset.last_poll_error = result.error_message
    asset.last_poll_status = "online" if result.is_reachable else "offline"
    asset.last_telemetry_source = "scheduled_poll"
    if result.is_reachable:
        asset.last_seen = result.checked_at
        asset.status = AssetStatus.ONLINE
    else:
        asset.status = AssetStatus.OFFLINE
        await upsert_offline_alert(db, organization_id, f"Asset unreachable: {asset.hostname}", "asset", asset_id=asset.id)
    await db.flush()
    await create_activity_event(db, organization_id, "asset_polled", "asset", f"Asset polled: {asset.hostname}", entity_id=str(asset.id), severity="info" if result.is_reachable else "warning", metadata={"latency_ms": result.latency_ms, "error": result.error_message})
    return {
        "asset_id": str(asset.id),
        "is_reachable": result.is_reachable,
        "latency_ms": result.latency_ms,
        "packet_loss_percent": result.packet_loss_percent,
        "checked_at": result.checked_at.isoformat(),
        "error_message": result.error_message,
    }


async def poll_radio_device(db: AsyncSession, radio: RadioDevice, credential: CredentialProfile | None = None) -> dict:
    reachability = await check_reachability(radio.ip_address)
    radio.is_online = reachability.is_reachable
    radio.last_poll_source = "scheduled_poll"
    radio.last_poll_latency_ms = reachability.latency_ms
    radio.last_poll_error = reachability.error_message
    if reachability.is_reachable:
        radio.last_seen = reachability.checked_at
    adapter_result: dict = {}
    if reachability.is_reachable:
        adapter = select_adapter(radio, credential)
        capabilities = adapter.get_capabilities()
        capabilities_dict = capabilities.as_dict()
        radio.adapter_capabilities = capabilities_dict
        radio.last_poll_source = capabilities_dict.get("adapter_type", "unknown")
        health = await adapter.get_health()
        info = await adapter.get_device_info()
        interfaces = await adapter.get_interfaces()
        wireless_metrics = await adapter.get_wireless_metrics()
        diagnosis = diagnose_wireless_snapshot(wireless_metrics)
        radio.latest_device_info = info.as_dict() | {"health": health.as_dict()}
        radio.latest_interface_status = {"interfaces": [item.as_dict() for item in interfaces]}
        radio.latest_wireless_metrics = {
            "snapshot": wireless_metrics.as_dict(),
            "diagnosis": diagnosis,
            "outdoor_profile": outdoor_profile_for_radio(radio, source=wireless_metrics.source, wireless_available=not diagnosis.get("partial")).as_dict(),
        }
        if capabilities_dict.get("adapter_type") == "generic_snmp" and health.online:
            radio.snmp_info = info.raw | {"interfaces": radio.latest_interface_status["interfaces"]}
        if health.error:
            radio.last_poll_error = health.error
            rule_name = "snmp_unreachable" if capabilities_dict.get("adapter_type") == "generic_snmp" else "connection_failure"
            title = f"SNMP unreachable: {radio.name}" if rule_name == "snmp_unreachable" else f"Adapter connection failed: {radio.name}"
            await upsert_radio_adapter_alert(db, radio.organization_id, radio.id, title, rule_name, metadata={"adapter": capabilities_dict, "error": health.error})
        down_interfaces = [item.as_dict() for item in interfaces if item.oper_status not in {None, "1", "up", "UP"}]
        if down_interfaces:
            await upsert_radio_adapter_alert(db, radio.organization_id, radio.id, f"Interface down on {radio.name}", "interface_down", severity=AlertSeverity.MEDIUM, metadata={"interfaces": down_interfaces})
        if not diagnosis.get("partial") and diagnosis.get("severity") in {"high", "critical"}:
            await upsert_radio_adapter_alert(db, radio.organization_id, radio.id, f"Wireless health degraded on {radio.name}", "wireless_health_degraded", severity=AlertSeverity(diagnosis["severity"]), metadata={"diagnosis": diagnosis, "metrics": wireless_metrics.as_dict()})
        if diagnosis.get("partial") and capabilities_dict.get("adapter_type") in {"tplink_cpe", "ubiquiti_airmax"} and capabilities_dict.get("configured"):
            await upsert_radio_adapter_alert(db, radio.organization_id, radio.id, f"Manual RF measurement required for {radio.name}", "missing_wireless_metrics", severity=AlertSeverity.LOW, metadata={"missing_fields": wireless_metrics.missing_fields, "adapter": capabilities_dict})
        adapter_result = {
            "adapter": capabilities_dict,
            "device_info": radio.latest_device_info,
            "health": health.as_dict(),
            "interfaces": [item.as_dict() for item in interfaces],
            "wireless_metrics": wireless_metrics.as_dict(),
            "diagnosis": diagnosis,
        }
    if not reachability.is_reachable:
        await upsert_offline_alert(db, radio.organization_id, f"Radio unreachable: {radio.name}", "radio", radio_id=radio.id)
    await db.flush()
    await create_activity_event(db, radio.organization_id, "radio_polled", "radio_device", f"Radio polled: {radio.name}", entity_id=str(radio.id), severity="info" if reachability.is_reachable else "warning", metadata={"latency_ms": reachability.latency_ms, "error": radio.last_poll_error})
    return {
        "radio_device_id": str(radio.id),
        "is_reachable": reachability.is_reachable,
        "latency_ms": reachability.latency_ms,
        "checked_at": reachability.checked_at.isoformat(),
        "error_message": radio.last_poll_error,
        **adapter_result,
    }
