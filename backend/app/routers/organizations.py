"""
NetSentinel AI — Organizations Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/", response_model=list[OrganizationResponse])
async def list_organizations(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all organizations."""
    result = await db.execute(
        select(Organization).offset(skip).limit(limit).order_by(Organization.name)
    )
    return result.scalars().all()


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single organization by ID."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(data: OrganizationCreate, db: AsyncSession = Depends(get_db)):
    """Create a new organization."""
    org = Organization(**data.model_dump())
    db.add(org)
    await db.flush()
    await db.refresh(org)
    return org


@router.patch("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str, data: OrganizationUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an existing organization."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(org, key, value)

    await db.flush()
    await db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(org_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an organization."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    await db.delete(org)
