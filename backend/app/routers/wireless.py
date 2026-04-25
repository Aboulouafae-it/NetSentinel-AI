"""
NetSentinel AI — Wireless Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.ai.wireless_diagnostics import WirelessAICopilot
from app.models.wireless import (
    AntennaProfile, PhysicalMount, RadioInterface,
    WirelessLink, WirelessLinkStatus, WirelessMetric, 
    FieldDiagnostic, MaintenanceLog
)
from app.schemas.wireless import (
    AntennaProfileCreate, AntennaProfileResponse,
    PhysicalMountCreate, PhysicalMountResponse,
    RadioInterfaceCreate, RadioInterfaceResponse,
    WirelessLinkCreate, WirelessLinkUpdate, WirelessLinkResponse,
    WirelessMetricCreate, WirelessMetricResponse,
    FieldDiagnosticCreate, FieldDiagnosticResponse,
    MaintenanceLogCreate, MaintenanceLogResponse
)

router = APIRouter(prefix="/wireless", tags=["Wireless Intelligence"])

# --- Antenna Profiles ---

@router.get("/antenna-profiles", response_model=list[AntennaProfileResponse])
async def list_antenna_profiles(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AntennaProfile).offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/antenna-profiles", response_model=AntennaProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_antenna_profile(data: AntennaProfileCreate, db: AsyncSession = Depends(get_db)):
    profile = AntennaProfile(**data.model_dump())
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile

# --- Physical Mounts ---

@router.get("/mounts", response_model=list[PhysicalMountResponse])
async def list_physical_mounts(site_id: str | None = None, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(PhysicalMount).offset(skip).limit(limit)
    if site_id:
        query = query.where(PhysicalMount.site_id == site_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/mounts", response_model=PhysicalMountResponse, status_code=status.HTTP_201_CREATED)
async def create_physical_mount(data: PhysicalMountCreate, db: AsyncSession = Depends(get_db)):
    mount = PhysicalMount(**data.model_dump())
    db.add(mount)
    await db.flush()
    await db.refresh(mount)
    return mount

# --- Radio Interfaces ---

@router.get("/interfaces", response_model=list[RadioInterfaceResponse])
async def list_radio_interfaces(asset_id: str | None = None, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(RadioInterface).offset(skip).limit(limit)
    if asset_id:
        query = query.where(RadioInterface.asset_id == asset_id)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/interfaces", response_model=RadioInterfaceResponse, status_code=status.HTTP_201_CREATED)
async def create_radio_interface(data: RadioInterfaceCreate, db: AsyncSession = Depends(get_db)):
    interface = RadioInterface(**data.model_dump())
    db.add(interface)
    await db.flush()
    await db.refresh(interface)
    return interface

# --- Links ---

@router.get("/links", response_model=list[WirelessLinkResponse])
async def list_wireless_links(
    organization_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(WirelessLink).offset(skip).limit(limit)
    if organization_id:
        query = query.where(WirelessLink.organization_id == organization_id)
    if status:
        query = query.where(WirelessLink.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/links", response_model=WirelessLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_wireless_link(data: WirelessLinkCreate, db: AsyncSession = Depends(get_db)):
    link = WirelessLink(**data.model_dump())
    db.add(link)
    await db.flush()
    await db.refresh(link)
    return link


@router.get("/links/{link_id}", response_model=WirelessLinkResponse)
async def get_wireless_link(link_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WirelessLink).where(WirelessLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Wireless Link not found")
    return link


@router.patch("/links/{link_id}", response_model=WirelessLinkResponse)
async def update_wireless_link(link_id: str, data: WirelessLinkUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WirelessLink).where(WirelessLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Wireless Link not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(link, key, value)

    await db.flush()
    await db.refresh(link)
    return link


# --- Metrics ---

@router.get("/links/{link_id}/metrics", response_model=list[WirelessMetricResponse])
async def get_link_metrics(link_id: str, limit: int = 100, db: AsyncSession = Depends(get_db)):
    query = select(WirelessMetric).where(WirelessMetric.wireless_link_id == link_id).order_by(WirelessMetric.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/links/{link_id}/metrics", response_model=WirelessMetricResponse, status_code=status.HTTP_201_CREATED)
async def record_link_metric(link_id: str, data: WirelessMetricCreate, db: AsyncSession = Depends(get_db)):
    if data.wireless_link_id != link_id:
        raise HTTPException(status_code=400, detail="Path ID and body ID mismatch")
    metric = WirelessMetric(**data.model_dump())
    db.add(metric)
    await db.flush()
    await db.refresh(metric)
    return metric


# --- Diagnostics ---

@router.get("/links/{link_id}/diagnostics", response_model=list[FieldDiagnosticResponse])
async def get_link_diagnostics(link_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(FieldDiagnostic).where(FieldDiagnostic.wireless_link_id == link_id).order_by(FieldDiagnostic.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/links/{link_id}/diagnostics", response_model=FieldDiagnosticResponse, status_code=status.HTTP_201_CREATED)
async def add_diagnostic(link_id: str, data: FieldDiagnosticCreate, db: AsyncSession = Depends(get_db)):
    if data.wireless_link_id != link_id:
        raise HTTPException(status_code=400, detail="Path ID and body ID mismatch")
    diagnostic = FieldDiagnostic(**data.model_dump())
    db.add(diagnostic)
    await db.flush()
    await db.refresh(diagnostic)
    return diagnostic


# --- AI Copilot ---

@router.get("/links/{link_id}/ai-brief")
async def get_ai_field_brief(link_id: str, db: AsyncSession = Depends(get_db)):
    copilot = WirelessAICopilot(db)
    result = await copilot.generate_field_brief(link_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


# --- Maintenance Logs ---

@router.get("/links/{link_id}/maintenance", response_model=list[MaintenanceLogResponse])
async def get_link_maintenance(link_id: str, limit: int = 50, db: AsyncSession = Depends(get_db)):
    query = select(MaintenanceLog).where(MaintenanceLog.wireless_link_id == link_id).order_by(MaintenanceLog.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/links/{link_id}/maintenance", response_model=MaintenanceLogResponse, status_code=status.HTTP_201_CREATED)
async def add_maintenance_log(link_id: str, data: MaintenanceLogCreate, db: AsyncSession = Depends(get_db)):
    if data.wireless_link_id != link_id:
        raise HTTPException(status_code=400, detail="Path ID and body ID mismatch")
    log = MaintenanceLog(**data.model_dump())
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log
