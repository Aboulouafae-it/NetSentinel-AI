"""
NetSentinel AI — Assets Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select

from app.database import get_db
from app.models.alert import Alert, AlertStatus
from app.models.asset import Asset, AssetType, AssetStatus
from app.models.site import Site
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse
from app.dependencies import get_current_user
from app.services.access_control import assert_same_organization
from app.services.asset_status import calculate_asset_status
from app.services.polling import poll_asset

router = APIRouter(prefix="/assets", tags=["Assets"])


def serialize_asset(asset: Asset, alerts: list[Alert]) -> dict:
    active_alerts = [
        alert for alert in alerts
        if alert.status in {AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED}
    ]
    risk = calculate_asset_status(asset, active_alerts)
    return {
        "id": str(asset.id),
        "hostname": asset.hostname,
        "ip_address": asset.ip_address,
        "mac_address": asset.mac_address,
        "asset_type": asset.asset_type.value if hasattr(asset.asset_type, "value") else asset.asset_type,
        "status": risk.status,
        "os_info": asset.os_info,
        "vendor": asset.vendor,
        "description": asset.description,
        "last_seen": asset.last_seen,
        "last_poll_status": asset.last_poll_status,
        "last_poll_latency_ms": asset.last_poll_latency_ms,
        "last_poll_packet_loss_percent": asset.last_poll_packet_loss_percent,
        "last_poll_error": asset.last_poll_error,
        "last_polled_at": asset.last_polled_at,
        "site_id": str(asset.site_id) if asset.site_id else None,
        "risk_level": risk.risk_level,
        "risk_reasons": risk.reasons,
        "related_alerts_count": len(active_alerts),
        "created_at": asset.created_at,
        "updated_at": asset.updated_at,
    }


@router.get("/", response_model=list[AssetResponse])
async def list_assets(
    site_id: str | None = None,
    search: str | None = None,
    asset_type: str | None = None,
    status: str | None = None,
    vendor: str | None = None,
    risk: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List assets with optional filters."""
    query = (
        select(Asset)
        .join(Site, Asset.site_id == Site.id)
        .where(Site.organization_id == current_user.organization_id)
        .order_by(Asset.hostname)
    )
    if site_id:
        query = query.where(Asset.site_id == site_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Asset.hostname.ilike(pattern), Asset.ip_address.ilike(pattern), Asset.vendor.ilike(pattern)))
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if vendor:
        query = query.where(Asset.vendor.ilike(f"%{vendor}%"))
    result = await db.execute(query)
    assets = result.scalars().all()
    alert_result = await db.execute(
        select(Alert).where(
            Alert.organization_id == current_user.organization_id,
            Alert.asset_id.in_([asset.id for asset in assets] or [None]),
        )
    )
    alerts_by_asset: dict[str, list[Alert]] = {}
    for alert in alert_result.scalars().all():
        alerts_by_asset.setdefault(str(alert.asset_id), []).append(alert)
    rows = [serialize_asset(asset, alerts_by_asset.get(str(asset.id), [])) for asset in assets]
    if status:
        rows = [row for row in rows if row["status"] == status]
    if risk:
        rows = [row for row in rows if row["risk_level"] == risk]
    return rows[skip: skip + limit]


@router.get("/stats")
async def asset_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get summary statistics for assets."""
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Site.organization_id == current_user.organization_id)
    )
    assets = result.scalars().all()

    total = len(assets)
    alert_result = await db.execute(
        select(Alert).where(
            Alert.organization_id == current_user.organization_id,
            Alert.asset_id.in_([asset.id for asset in assets] or [None]),
        )
    )
    alerts_by_asset: dict[str, list[Alert]] = {}
    for alert in alert_result.scalars().all():
        alerts_by_asset.setdefault(str(alert.asset_id), []).append(alert)
    risk_results = [calculate_asset_status(asset, alerts_by_asset.get(str(asset.id), [])) for asset in assets]
    online = sum(1 for result in risk_results if result.status == "online")
    offline = sum(1 for result in risk_results if result.status == "offline")
    degraded = sum(1 for result in risk_results if result.status == "degraded")
    unmanaged = sum(1 for result in risk_results if result.risk_level == "unknown")
    at_risk = sum(1 for result in risk_results if result.risk_level == "at_risk")

    return {
        "total": total,
        "online": online,
        "offline": offline,
        "degraded": degraded,
        "unmanaged": unmanaged,
        "at_risk": at_risk,
        "uptime_percentage": round((online / total * 100) if total > 0 else 0, 1),
    }


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single asset by ID."""
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id == asset_id, Site.organization_id == current_user.organization_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    alerts = (await db.execute(select(Alert).where(Alert.asset_id == asset.id, Alert.organization_id == current_user.organization_id))).scalars().all()
    return serialize_asset(asset, list(alerts))


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(data: AssetCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new asset."""
    site = await db.scalar(select(Site).where(Site.id == data.site_id))
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    assert_same_organization(current_user.organization_id, site.organization_id)
    asset = Asset(**data.model_dump())
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, data: AssetUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing asset."""
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id == asset_id, Site.organization_id == current_user.organization_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    await db.flush()
    await db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an asset."""
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id == asset_id, Site.organization_id == current_user.organization_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)


@router.post("/{asset_id}/poll")
async def poll_asset_endpoint(asset_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id == asset_id, Site.organization_id == current_user.organization_id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return await poll_asset(db, asset, current_user.organization_id)


@router.post("/poll-bulk")
async def poll_assets_bulk(asset_ids: list[str], db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if len(asset_ids) > 25:
        raise HTTPException(status_code=400, detail="Bulk polling is limited to 25 assets")
    result = await db.execute(
        select(Asset).join(Site, Asset.site_id == Site.id).where(Asset.id.in_(asset_ids), Site.organization_id == current_user.organization_id)
    )
    assets = result.scalars().all()
    return [await poll_asset(db, asset, current_user.organization_id) for asset in assets]
