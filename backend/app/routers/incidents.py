"""
NetSentinel AI — Incidents Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.incident import Incident, IncidentStatus
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    organization_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List incidents with optional filters."""
    query = select(Incident).offset(skip).limit(limit).order_by(Incident.created_at.desc())
    if organization_id:
        query = query.where(Incident.organization_id == organization_id)
    if status:
        query = query.where(Incident.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def incident_stats(db: AsyncSession = Depends(get_db)):
    """Get incident summary statistics."""
    result = await db.execute(select(Incident))
    incidents = result.scalars().all()

    total = len(incidents)
    open_count = sum(1 for i in incidents if i.status == IncidentStatus.OPEN)
    investigating = sum(1 for i in incidents if i.status == IncidentStatus.INVESTIGATING)

    return {
        "total": total,
        "open": open_count,
        "investigating": investigating,
    }


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single incident by ID."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(data: IncidentCreate, db: AsyncSession = Depends(get_db)):
    """Create a new incident."""
    incident = Incident(**data.model_dump())
    db.add(incident)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str, data: IncidentUpdate, db: AsyncSession = Depends(get_db)
):
    """Update an existing incident."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)

    await db.flush()
    await db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an incident."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    await db.delete(incident)
