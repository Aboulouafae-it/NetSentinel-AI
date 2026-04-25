"""
NetSentinel AI — Sites Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.get("/", response_model=list[SiteResponse])
async def list_sites(
    organization_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List sites, optionally filtered by organization."""
    query = select(Site).offset(skip).limit(limit).order_by(Site.name)
    if organization_id:
        query = query.where(Site.organization_id == organization_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single site by ID."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


@router.post("/", response_model=SiteResponse, status_code=status.HTTP_201_CREATED)
async def create_site(data: SiteCreate, db: AsyncSession = Depends(get_db)):
    """Create a new site."""
    site = Site(**data.model_dump())
    db.add(site)
    await db.flush()
    await db.refresh(site)
    return site


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(site_id: str, data: SiteUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing site."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(site, key, value)

    await db.flush()
    await db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_site(site_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a site."""
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    await db.delete(site)
