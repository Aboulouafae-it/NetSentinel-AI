"""
NetSentinel AI — Radio Devices Router

CRUD for managed radio devices + diagnostic trigger endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.radio_device import RadioDevice
from app.models.field_measurement import FieldMeasurement
from app.models.user import User
from app.models.credential import CredentialProfile
from app.schemas.radio_device import (
    RadioDeviceCreate,
    RadioDeviceResponse,
    DiagnosticReportResponse,
)
from app.services.rca_engine import analyze_measurement
from app.dependencies import get_current_user
from app.services.polling import poll_radio_device

router = APIRouter(prefix="/radio-devices", tags=["Radio Devices"])


@router.get("/", response_model=list[RadioDeviceResponse])
async def list_radio_devices(
    vendor: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all managed radio devices."""
    query = select(RadioDevice).where(RadioDevice.organization_id == current_user.organization_id).order_by(RadioDevice.name).offset(skip).limit(limit)
    if vendor:
        query = query.where(RadioDevice.vendor == vendor)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=RadioDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_radio_device(
    data: RadioDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a new radio device for management."""
    device = RadioDevice(**data.model_dump(), organization_id=current_user.organization_id)
    db.add(device)
    await db.flush()
    await db.refresh(device)
    return device


@router.get("/{device_id}", response_model=RadioDeviceResponse)
async def get_radio_device(device_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(RadioDevice).where(RadioDevice.id == device_id, RadioDevice.organization_id == current_user.organization_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Radio device not found")
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_radio_device(device_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(RadioDevice).where(RadioDevice.id == device_id, RadioDevice.organization_id == current_user.organization_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Radio device not found")
    await db.delete(device)


# --- Diagnostics ---

@router.post("/diagnose/{measurement_id}", response_model=DiagnosticReportResponse)
async def diagnose_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Run the RCA engine on a specific field measurement.
    Returns ranked probable causes with confidence scores.
    """
    result = await db.execute(
        select(FieldMeasurement).where(
            FieldMeasurement.id == measurement_id,
            FieldMeasurement.organization_id == current_user.organization_id,
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Field measurement not found")

    report = analyze_measurement(measurement)
    return report


@router.get("/diagnose/latest", response_model=DiagnosticReportResponse)
async def diagnose_latest_measurement(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run RCA on the most recent field measurement."""
    result = await db.execute(
        select(FieldMeasurement)
        .where(FieldMeasurement.organization_id == current_user.organization_id)
        .order_by(FieldMeasurement.created_at.desc())
        .limit(1)
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="No field measurements found")

    report = analyze_measurement(measurement)
    return report


# --- Real ICMP Ping ---

@router.post("/{device_id}/ping")
async def ping_radio_device(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Perform a REAL ICMP ping to a registered radio device.
    Returns actual reachability status and response time.
    """
    from app.services.discovery_service import ping_host

    result = await db.execute(select(RadioDevice).where(RadioDevice.id == device_id, RadioDevice.organization_id == current_user.organization_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Radio device not found")

    ping_result = await ping_host(device.ip_address, timeout=3, count=3)

    return {
        "device_id": str(device.id),
        "device_name": device.name,
        "ip_address": device.ip_address,
        "is_reachable": ping_result["is_reachable"],
        "response_time_ms": ping_result["response_time_ms"],
    }


@router.post("/{device_id}/poll")
async def poll_radio_device_endpoint(
    device_id: str,
    credential_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    radio = await db.scalar(select(RadioDevice).where(RadioDevice.id == device_id, RadioDevice.organization_id == current_user.organization_id))
    if not radio:
        raise HTTPException(status_code=404, detail="Radio device not found")
    credential = None
    if credential_id:
        credential = await db.scalar(select(CredentialProfile).where(CredentialProfile.id == credential_id, CredentialProfile.organization_id == current_user.organization_id))
        if not credential:
            raise HTTPException(status_code=404, detail="Credential profile not found")
    return await poll_radio_device(db, radio, credential)


@router.post("/ping-all")
async def ping_all_radio_devices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Ping ALL registered radio devices and return real status for each.
    This is a real network operation — every result is from an actual ICMP probe.
    """
    from app.services.discovery_service import ping_host
    import asyncio

    result = await db.execute(select(RadioDevice).where(RadioDevice.organization_id == current_user.organization_id).order_by(RadioDevice.name))
    devices = result.scalars().all()

    if not devices:
        return []

    async def check_device(device):
        ping_result = await ping_host(device.ip_address, timeout=3, count=1)
        return {
            "device_id": str(device.id),
            "device_name": device.name,
            "ip_address": device.ip_address,
            "vendor": device.vendor.value if hasattr(device.vendor, 'value') else device.vendor,
            "device_model": device.device_model,
            "site_name": device.site_name,
            "is_reachable": ping_result["is_reachable"],
            "response_time_ms": ping_result["response_time_ms"],
        }

    results = await asyncio.gather(*[check_device(d) for d in devices])
    return results
