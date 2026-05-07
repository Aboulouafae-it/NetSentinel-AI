"""
NetSentinel AI — Field Measurements Router

REST API for real manually-entered wireless link measurements.
Every record stored through this router is a REAL value entered
by a human operator — no generated, mocked, or simulated data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.field_measurement import FieldMeasurement
from app.models.user import User
from app.models.wireless import WirelessLink
from app.schemas.field_measurement import (
    FieldMeasurementCreate,
    FieldMeasurementUpdate,
    FieldMeasurementResponse,
)
from app.services.wireless_health import diagnose_wireless_measurement
from app.dependencies import get_current_user
from app.services.access_control import assert_same_organization, require_organization_scope
from app.services.activity import create_activity_event

router = APIRouter(prefix="/field-measurements", tags=["Field Measurements"])


def measurement_response(measurement: FieldMeasurement) -> dict:
    """Serialize a measurement with deterministic wireless health diagnosis."""
    diagnosis = diagnose_wireless_measurement(measurement).as_dict()
    link_status = (
        measurement.link_status.value
        if hasattr(measurement.link_status, "value")
        else measurement.link_status
    )
    return {
        "id": str(measurement.id),
        "organization_id": str(measurement.organization_id) if measurement.organization_id else None,
        "wireless_link_id": str(measurement.wireless_link_id) if measurement.wireless_link_id else None,
        "link_name": measurement.link_name,
        "origin_site": measurement.origin_site,
        "destination_site": measurement.destination_site,
        "vendor": measurement.vendor,
        "device_model": measurement.device_model,
        "frequency_mhz": measurement.frequency_mhz,
        "channel_width_mhz": measurement.channel_width_mhz,
        "rssi_dbm": measurement.rssi_dbm,
        "snr_db": measurement.snr_db,
        "noise_floor_dbm": measurement.noise_floor_dbm,
        "ccq_percent": measurement.ccq_percent,
        "latency_ms": measurement.latency_ms,
        "packet_loss_percent": measurement.packet_loss_percent,
        "tx_capacity_mbps": measurement.tx_capacity_mbps,
        "rx_capacity_mbps": measurement.rx_capacity_mbps,
        "link_status": link_status,
        "technician_name": measurement.technician_name,
        "notes": measurement.notes,
        "diagnosis": diagnosis,
        "created_at": measurement.created_at,
        "updated_at": measurement.updated_at,
    }


async def create_health_alert_if_needed(measurement: FieldMeasurement, db: AsyncSession) -> Alert | None:
    diagnosis = diagnose_wireless_measurement(measurement)
    if diagnosis.status not in {"Poor", "Critical"}:
        return None

    category = diagnosis.likely_root_cause.split(";")[0].strip().lower().replace(" ", "_")[:120]
    link_key = str(measurement.wireless_link_id) if measurement.wireless_link_id else f"name:{measurement.link_name.lower()}"
    dedupe_key = f"wireless_health:{link_key}:{category}"
    existing = await db.execute(
        select(Alert).where(
            Alert.dedupe_key == dedupe_key,
            Alert.rule_name == "wireless_health_score",
            Alert.status.in_([AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]),
        )
    )
    existing_alert = existing.scalar_one_or_none()
    if existing_alert:
        existing_alert.description = (
            f"Wireless health score is {diagnosis.health_score}/100. "
            f"Likely cause: {diagnosis.likely_root_cause}. "
            f"Recommended action: {diagnosis.recommended_actions[0]}"
        )
        existing_alert.severity = AlertSeverity(diagnosis.severity)
        existing_alert.occurrence_count += 1
        existing_alert.last_seen = datetime.now(timezone.utc)
        existing_alert.source_metadata = {
            "latest_field_measurement_id": str(measurement.id),
            "diagnostic_category": category,
            "health_score": diagnosis.health_score,
            "status": diagnosis.status,
            "evidence": diagnosis.evidence,
            "recommended_actions": diagnosis.recommended_actions,
        }
        await db.flush()
        return existing_alert

    alert = Alert(
        title=f"{diagnosis.status} wireless health on {measurement.link_name}",
        description=(
            f"Wireless health score is {diagnosis.health_score}/100. "
            f"Likely cause: {diagnosis.likely_root_cause}. "
            f"Recommended action: {diagnosis.recommended_actions[0]}"
        ),
        severity=AlertSeverity(diagnosis.severity),
        status=AlertStatus.OPEN,
        source="FieldMeasurement",
        rule_name="wireless_health_score",
        organization_id=measurement.organization_id,
        wireless_link_id=measurement.wireless_link_id,
        dedupe_key=dedupe_key,
        occurrence_count=1,
        last_seen=datetime.now(timezone.utc),
        source_metadata={
            "latest_field_measurement_id": str(measurement.id),
            "diagnostic_category": category,
            "health_score": diagnosis.health_score,
            "status": diagnosis.status,
            "evidence": diagnosis.evidence,
            "recommended_actions": diagnosis.recommended_actions,
        },
    )
    db.add(alert)
    await db.flush()
    return alert


@router.get("/", response_model=list[FieldMeasurementResponse])
async def list_field_measurements(
    link_status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all real field measurements, newest first."""
    query = (
        select(FieldMeasurement)
        .where(FieldMeasurement.organization_id == current_user.organization_id)
        .order_by(FieldMeasurement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if link_status:
        query = query.where(FieldMeasurement.link_status == link_status)

    result = await db.execute(query)
    return [measurement_response(measurement) for measurement in result.scalars().all()]


@router.get("/stats")
async def field_measurement_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Summary statistics across all real field measurements."""
    result = await db.execute(
        select(FieldMeasurement).where(FieldMeasurement.organization_id == current_user.organization_id)
    )
    measurements = result.scalars().all()

    total = len(measurements)
    if total == 0:
        return {
            "total": 0,
            "operational": 0,
            "degraded": 0,
            "down": 0,
            "avg_rssi": None,
            "avg_snr": None,
            "avg_latency": None,
        }

    operational = sum(1 for m in measurements if m.link_status == "operational")
    degraded = sum(1 for m in measurements if m.link_status == "degraded")
    down = sum(1 for m in measurements if m.link_status == "down")

    rssi_values = [m.rssi_dbm for m in measurements if m.rssi_dbm is not None]
    snr_values = [m.snr_db for m in measurements if m.snr_db is not None]
    latency_values = [m.latency_ms for m in measurements if m.latency_ms is not None]

    return {
        "total": total,
        "operational": operational,
        "degraded": degraded,
        "down": down,
        "avg_rssi": round(sum(rssi_values) / len(rssi_values), 1) if rssi_values else None,
        "avg_snr": round(sum(snr_values) / len(snr_values), 1) if snr_values else None,
        "avg_latency": round(sum(latency_values) / len(latency_values), 2) if latency_values else None,
    }


@router.get("/{measurement_id}", response_model=FieldMeasurementResponse)
async def get_field_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single field measurement by ID."""
    result = await db.execute(
        select(FieldMeasurement).where(
            FieldMeasurement.id == measurement_id,
            FieldMeasurement.organization_id == current_user.organization_id,
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")
    return measurement_response(measurement)


@router.post("/", response_model=FieldMeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_field_measurement(
    data: FieldMeasurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a new REAL field measurement.

    This endpoint is for human operators to enter actual values
    read from wireless equipment. Do NOT use this to insert
    generated or simulated data.

    Automatically evaluates thresholds and creates real alerts
    if any values are outside acceptable ranges.
    """
    require_organization_scope(current_user.organization_id)
    payload = data.model_dump()
    if payload.get("wireless_link_id"):
        result = await db.execute(select(WirelessLink).where(WirelessLink.id == payload["wireless_link_id"]))
        link = result.scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=404, detail="Wireless link not found")
        assert_same_organization(current_user.organization_id, link.organization_id)
        payload["link_name"] = payload.get("link_name") or link.name
        if link.near_end_radio_id and not payload.get("origin_site"):
            payload["origin_site"] = "Near-end radio linked"
        if link.far_end_radio_id and not payload.get("destination_site"):
            payload["destination_site"] = "Far-end radio linked"
    if not payload.get("link_name"):
        raise HTTPException(status_code=422, detail="link_name is required when wireless_link_id is not provided")
    payload["organization_id"] = current_user.organization_id
    measurement = FieldMeasurement(**payload)
    db.add(measurement)
    await db.flush()
    await db.refresh(measurement)

    # Auto-evaluate deterministic health and generate a traceable alert when
    # the overall status is Poor or Critical.
    await create_health_alert_if_needed(measurement, db)
    await create_activity_event(db, current_user.organization_id, "field_measurement_saved", "field_measurement", f"Field measurement saved: {measurement.link_name}", actor_type="user", actor_id=str(current_user.id), entity_id=str(measurement.id))

    # Auto-evaluate simple threshold alerts as additional evidence. This is
    # intentionally non-blocking so measurement capture remains reliable.
    try:
        from app.services.alert_engine import evaluate_measurement
        alerts = await evaluate_measurement(measurement, db)
        if alerts:
            await db.flush()
    except Exception:
        pass  # Alert generation failure should not block measurement save

    return measurement_response(measurement)


@router.patch("/{measurement_id}", response_model=FieldMeasurementResponse)
async def update_field_measurement(
    measurement_id: str,
    data: FieldMeasurementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing field measurement."""
    result = await db.execute(
        select(FieldMeasurement).where(
            FieldMeasurement.id == measurement_id,
            FieldMeasurement.organization_id == current_user.organization_id,
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("wireless_link_id"):
        result = await db.execute(select(WirelessLink).where(WirelessLink.id == update_data["wireless_link_id"]))
        link = result.scalar_one_or_none()
        if not link:
            raise HTTPException(status_code=404, detail="Wireless link not found")
        assert_same_organization(current_user.organization_id, link.organization_id)
        update_data["link_name"] = update_data.get("link_name") or link.name
    for key, value in update_data.items():
        setattr(measurement, key, value)

    await db.flush()
    await db.refresh(measurement)
    await create_health_alert_if_needed(measurement, db)
    return measurement_response(measurement)


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a field measurement."""
    result = await db.execute(
        select(FieldMeasurement).where(
            FieldMeasurement.id == measurement_id,
            FieldMeasurement.organization_id == current_user.organization_id,
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")
    await db.delete(measurement)
