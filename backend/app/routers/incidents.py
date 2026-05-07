"""
NetSentinel AI — Incidents Router
"""

from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.alert import Alert, AlertStatus
from app.models.incident import Incident, IncidentStatus
from app.models.user import User
from app.schemas.incident import (
    IncidentAssignRequest,
    IncidentCreate,
    IncidentEventCreate,
    IncidentNoteCreate,
    IncidentResolveRequest,
    IncidentTaskCreate,
    IncidentTaskUpdate,
    IncidentUpdate,
    IncidentResponse,
)
from app.dependencies import get_current_user
from app.services.access_control import assert_same_organization, require_organization_scope
from app.services.activity import create_activity_event

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def timeline_event(event_type: str, message: str, user: User) -> dict:
    return {
        "id": str(uuid4()),
        "event_type": event_type,
        "message": message,
        "user_id": str(user.id),
        "user_name": user.full_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def append_timeline(incident: Incident, event_type: str, message: str, user: User) -> None:
    events = list(incident.timeline_events or [])
    events.append(timeline_event(event_type, message, user))
    incident.timeline_events = events


async def get_scoped_incident(incident_id: str, db: AsyncSession, user: User) -> Incident:
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id, Incident.organization_id == user.organization_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.get("/", response_model=list[IncidentResponse])
async def list_incidents(
    organization_id: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List incidents with optional filters."""
    require_organization_scope(current_user.organization_id)
    if organization_id:
        assert_same_organization(current_user.organization_id, organization_id)
    query = (
        select(Incident)
        .where(Incident.organization_id == current_user.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Incident.created_at.desc())
    )
    if status:
        query = query.where(Incident.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def incident_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get incident summary statistics."""
    result = await db.execute(select(Incident).where(Incident.organization_id == current_user.organization_id))
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
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single incident by ID."""
    result = await db.execute(select(Incident).where(Incident.id == incident_id, Incident.organization_id == current_user.organization_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(data: IncidentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new incident."""
    require_organization_scope(current_user.organization_id)
    payload = data.model_dump()
    if payload.get("organization_id"):
        assert_same_organization(current_user.organization_id, payload["organization_id"])
    payload["organization_id"] = current_user.organization_id
    payload.setdefault("notes", [])
    payload.setdefault("timeline_events", [])
    payload.setdefault("tasks", [])
    payload.setdefault("impacted_services", [])
    incident = Incident(**payload)
    db.add(incident)
    await db.flush()
    append_timeline(incident, "created", "Incident created", current_user)
    await create_activity_event(db, current_user.organization_id, "incident_created", "incident", f"Incident created: {incident.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(incident.id), severity=payload.get("severity", "medium") if payload.get("severity") in {"info", "warning", "error", "critical"} else "info")
    await db.refresh(incident)
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str, data: IncidentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Update an existing incident."""
    incident = await get_scoped_incident(incident_id, db, current_user)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(incident, key, value)
    if update_data:
        append_timeline(incident, "updated", "Incident details updated", current_user)

    await db.flush()
    await db.refresh(incident)
    return incident


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_incident(incident_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an incident."""
    incident = await get_scoped_incident(incident_id, db, current_user)
    await db.delete(incident)


@router.get("/{incident_id}/details")
async def get_incident_details(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    alerts = await db.scalars(
        select(Alert)
        .where(Alert.incident_id == incident.id, Alert.organization_id == current_user.organization_id)
        .order_by(Alert.created_at.desc())
    )
    return {"incident": incident, "alerts": list(alerts)}


@router.post("/{incident_id}/assign", response_model=IncidentResponse)
async def assign_incident(
    incident_id: str,
    data: IncidentAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    incident.assigned_to = data.assigned_to
    if incident.status == IncidentStatus.OPEN:
        incident.status = IncidentStatus.INVESTIGATING
    append_timeline(incident, "assigned", f"Assigned to {data.assigned_to}", current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/notes", response_model=IncidentResponse)
async def add_incident_note(
    incident_id: str,
    data: IncidentNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    notes = list(incident.notes or [])
    notes.append(
        {
            "id": str(uuid4()),
            "note": data.note,
            "user_id": str(current_user.id),
            "user_name": current_user.full_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    incident.notes = notes
    append_timeline(incident, "note_added", "Note added", current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/events", response_model=IncidentResponse)
async def add_incident_event(
    incident_id: str,
    data: IncidentEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    append_timeline(incident, data.event_type, data.message, current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/tasks", response_model=IncidentResponse)
async def add_incident_task(
    incident_id: str,
    data: IncidentTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    tasks = list(incident.tasks or [])
    tasks.append({"id": str(uuid4()), "title": data.title, "completed": False})
    incident.tasks = tasks
    append_timeline(incident, "task_added", f"Task added: {data.title}", current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.patch("/{incident_id}/tasks/{task_id}", response_model=IncidentResponse)
async def update_incident_task(
    incident_id: str,
    task_id: str,
    data: IncidentTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    tasks = list(incident.tasks or [])
    updated = False
    for task in tasks:
        if task.get("id") == task_id:
            task["completed"] = data.completed
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    incident.tasks = tasks
    append_timeline(incident, "task_updated", "Task checklist updated", current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/alerts/{alert_id}", response_model=IncidentResponse)
async def link_alert_to_incident(
    incident_id: str,
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    alert = await db.scalar(select(Alert).where(Alert.id == alert_id, Alert.organization_id == current_user.organization_id))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.incident_id = incident.id
    alert.status = AlertStatus.ESCALATED
    append_timeline(incident, "alert_linked", f"Linked alert: {alert.title}", current_user)
    await db.flush()
    await db.refresh(incident)
    return incident


@router.post("/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: str,
    data: IncidentResolveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await get_scoped_incident(incident_id, db, current_user)
    incident.status = IncidentStatus.RESOLVED
    incident.resolution_notes = data.resolution_notes
    append_timeline(incident, "resolved", "Incident resolved", current_user)
    await create_activity_event(db, current_user.organization_id, "incident_resolved", "incident", f"Incident resolved: {incident.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(incident.id))
    linked_alerts = await db.scalars(select(Alert).where(Alert.incident_id == incident.id, Alert.organization_id == current_user.organization_id))
    for alert in linked_alerts:
        alert.status = AlertStatus.RESOLVED
    await db.flush()
    await db.refresh(incident)
    return incident
