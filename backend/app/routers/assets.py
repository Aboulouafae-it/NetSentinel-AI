"""
NetSentinel AI — Assets Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.asset import Asset, AssetType, AssetStatus
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("/", response_model=list[AssetResponse])
async def list_assets(
    site_id: str | None = None,
    asset_type: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List assets with optional filters."""
    query = select(Asset).offset(skip).limit(limit).order_by(Asset.hostname)
    if site_id:
        query = query.where(Asset.site_id == site_id)
    if asset_type:
        query = query.where(Asset.asset_type == asset_type)
    if status:
        query = query.where(Asset.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def asset_stats(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for assets."""
    result = await db.execute(select(Asset))
    assets = result.scalars().all()

    total = len(assets)
    online = sum(1 for a in assets if a.status == AssetStatus.ONLINE)
    offline = sum(1 for a in assets if a.status == AssetStatus.OFFLINE)
    degraded = sum(1 for a in assets if a.status == AssetStatus.DEGRADED)

    return {
        "total": total,
        "online": online,
        "offline": offline,
        "degraded": degraded,
        "uptime_percentage": round((online / total * 100) if total > 0 else 0, 1),
    }


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single asset by ID."""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(data: AssetCreate, db: AsyncSession = Depends(get_db)):
    """Create a new asset."""
    asset = Asset(**data.model_dump())
    db.add(asset)
    await db.flush()
    await db.refresh(asset)
    return asset


@router.patch("/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, data: AssetUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing asset."""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
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
async def delete_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an asset."""
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.delete(asset)
