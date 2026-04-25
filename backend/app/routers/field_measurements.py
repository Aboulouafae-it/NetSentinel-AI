"""
NetSentinel AI — Field Measurements Router

REST API for real manually-entered wireless link measurements.
Every record stored through this router is a REAL value entered
by a human operator — no generated, mocked, or simulated data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.field_measurement import FieldMeasurement
from app.schemas.field_measurement import (
    FieldMeasurementCreate,
    FieldMeasurementUpdate,
    FieldMeasurementResponse,
)

router = APIRouter(prefix="/field-measurements", tags=["Field Measurements"])


@router.get("/", response_model=list[FieldMeasurementResponse])
async def list_field_measurements(
    link_status: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """List all real field measurements, newest first."""
    query = (
        select(FieldMeasurement)
        .order_by(FieldMeasurement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if link_status:
        query = query.where(FieldMeasurement.link_status == link_status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def field_measurement_stats(db: AsyncSession = Depends(get_db)):
    """Summary statistics across all real field measurements."""
    result = await db.execute(select(FieldMeasurement))
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
):
    """Get a single field measurement by ID."""
    result = await db.execute(
        select(FieldMeasurement).where(FieldMeasurement.id == measurement_id)
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")
    return measurement


@router.post("/", response_model=FieldMeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_field_measurement(
    data: FieldMeasurementCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Record a new REAL field measurement.

    This endpoint is for human operators to enter actual values
    read from wireless equipment. Do NOT use this to insert
    generated or simulated data.

    Automatically evaluates thresholds and creates real alerts
    if any values are outside acceptable ranges.
    """
    measurement = FieldMeasurement(**data.model_dump())
    db.add(measurement)
    await db.flush()
    await db.refresh(measurement)

    # Auto-evaluate thresholds and generate alerts
    try:
        from app.services.alert_engine import evaluate_measurement
        alerts = await evaluate_measurement(measurement, db)
        if alerts:
            await db.flush()
    except Exception:
        pass  # Alert generation failure should not block measurement save

    return measurement


@router.patch("/{measurement_id}", response_model=FieldMeasurementResponse)
async def update_field_measurement(
    measurement_id: str,
    data: FieldMeasurementUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing field measurement."""
    result = await db.execute(
        select(FieldMeasurement).where(FieldMeasurement.id == measurement_id)
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(measurement, key, value)

    await db.flush()
    await db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a field measurement."""
    result = await db.execute(
        select(FieldMeasurement).where(FieldMeasurement.id == measurement_id)
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")
    await db.delete(measurement)
