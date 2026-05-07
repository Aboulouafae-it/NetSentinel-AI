"""Scheduled polling foundation for worker integration."""

from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset import Asset, AssetStatus
from app.models.radio_device import RadioDevice
from app.models.site import Site
from app.services.polling import poll_asset, poll_radio_device

DEFAULT_STALE_AFTER_MINUTES = 30
MAX_ORG_POLL_BATCH = 25


async def mark_stale_assets(db: AsyncSession, organization_id, stale_after_minutes: int = DEFAULT_STALE_AFTER_MINUTES) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=stale_after_minutes)
    result = await db.execute(select(Asset).join(Site, Asset.site_id == Site.id).where(Site.organization_id == organization_id))
    count = 0
    for asset in result.scalars().all():
        if asset.last_seen is None:
            asset.status = AssetStatus.UNKNOWN
            count += 1
        elif asset.last_seen < cutoff:
            asset.status = AssetStatus.OFFLINE
            count += 1
    await db.flush()
    return count


async def poll_org_assets(db: AsyncSession, organization_id, limit: int = MAX_ORG_POLL_BATCH) -> list[dict]:
    result = await db.execute(select(Asset).join(Site, Asset.site_id == Site.id).where(Site.organization_id == organization_id).limit(min(limit, MAX_ORG_POLL_BATCH)))
    return [await poll_asset(db, asset, organization_id) for asset in result.scalars().all()]


async def poll_org_radios(db: AsyncSession, organization_id, limit: int = MAX_ORG_POLL_BATCH) -> list[dict]:
    result = await db.execute(select(RadioDevice).where(RadioDevice.organization_id == organization_id, RadioDevice.is_monitored == True).limit(min(limit, MAX_ORG_POLL_BATCH)))
    return [await poll_radio_device(db, radio) for radio in result.scalars().all()]
