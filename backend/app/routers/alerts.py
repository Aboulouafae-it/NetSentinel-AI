"""
NetSentinel AI — Alerts Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from sqlalchemy import select

from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.incident import Incident, IncidentSeverity
from app.models.user import User
from app.schemas.alert import AlertActionRequest, AlertCreate, AlertUpdate, AlertResponse
from app.services.response_engine import ResponseEngine
from app.dependencies import get_current_user
from app.services.access_control import assert_same_organization, require_organization_scope
from app.services.activity import create_activity_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def append_alert_event(alert: Alert, event_type: str, user: User, note: str | None = None) -> None:
    metadata = dict(alert.source_metadata or {})
    history = list(metadata.get("lifecycle_history") or [])
    history.append(
        {
            "event_type": event_type,
            "note": note,
            "user_id": str(user.id),
            "user_name": user.full_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )
    metadata["lifecycle_history"] = history
    alert.source_metadata = metadata


async def get_scoped_alert(alert_id: str, db: AsyncSession, user: User) -> Alert:
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.organization_id == user.organization_id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/", response_model=list[AlertResponse])
async def list_alerts(
    organization_id: str | None = None,
    asset_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List alerts with optional filters."""
    require_organization_scope(current_user.organization_id)
    if organization_id:
        assert_same_organization(current_user.organization_id, organization_id)
    query = (
        select(Alert)
        .where(Alert.organization_id == current_user.organization_id)
        .offset(skip)
        .limit(limit)
        .order_by(Alert.created_at.desc())
    )
    if severity:
        query = query.where(Alert.severity == severity)
    if status:
        query = query.where(Alert.status == status)
    if asset_id:
        query = query.where(Alert.asset_id == asset_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def alert_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get alert summary statistics."""
    result = await db.execute(select(Alert).where(Alert.organization_id == current_user.organization_id))
    alerts = result.scalars().all()

    total = len(alerts)
    open_count = sum(1 for a in alerts if a.status == AlertStatus.OPEN)
    critical = sum(1 for a in alerts if a.severity == AlertSeverity.CRITICAL)
    high = sum(1 for a in alerts if a.severity == AlertSeverity.HIGH)

    return {
        "total": total,
        "open": open_count,
        "critical": critical,
        "high": high,
    }


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single alert by ID."""
    alert = await get_scoped_alert(alert_id, db, current_user)
    return alert


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new alert."""
    require_organization_scope(current_user.organization_id)
    payload = data.model_dump()
    if payload.get("organization_id"):
        assert_same_organization(current_user.organization_id, payload["organization_id"])
    payload["organization_id"] = current_user.organization_id
    alert = Alert(**payload)
    db.add(alert)
    await db.flush()
    await create_activity_event(db, current_user.organization_id, "alert_created", "alert", f"Alert created: {alert.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(alert.id), severity="warning" if str(alert.severity.value if hasattr(alert.severity, "value") else alert.severity) in {"critical", "high"} else "info")
    await db.refresh(alert)
    
    # Trigger automation playbooks
    engine = ResponseEngine(db)
    await engine.evaluate_alert(alert)
    await db.commit()
    
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    data: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing alert."""
    alert = await get_scoped_alert(alert_id, db, current_user)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)

    await db.flush()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an alert."""
    alert = await get_scoped_alert(alert_id, db, current_user)
    await db.delete(alert)


@router.post("/{alert_id}/incident", status_code=status.HTTP_201_CREATED)
async def create_incident_from_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a minimal incident from an alert and link both records."""
    alert = await get_scoped_alert(alert_id, db, current_user)
    if alert.incident_id:
        return {"incident_id": str(alert.incident_id), "created": False}

    severity = alert.severity.value if hasattr(alert.severity, "value") else alert.severity
    incident = Incident(
        title=f"Incident: {alert.title}",
        description=alert.description,
        severity=IncidentSeverity(severity if severity in {"critical", "high", "medium", "low"} else "medium"),
        organization_id=current_user.organization_id,
        assigned_to=None,
        timeline_events=[
            {
                "event_type": "created_from_alert",
                "message": f"Incident created from alert {alert.title}",
                "user_id": str(current_user.id),
                "user_name": current_user.full_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
        notes=[],
        tasks=[],
        impacted_services=[],
    )
    db.add(incident)
    await db.flush()
    alert.incident_id = incident.id
    alert.status = AlertStatus.ESCALATED
    append_alert_event(alert, "incident_created", current_user)
    await db.flush()
    return {"incident_id": str(incident.id), "created": True}


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    data: AlertActionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = await get_scoped_alert(alert_id, db, current_user)
    if alert.status == AlertStatus.RESOLVED:
        raise HTTPException(status_code=409, detail="Resolved alerts cannot be acknowledged")
    alert.status = AlertStatus.ACKNOWLEDGED
    append_alert_event(alert, "acknowledged", current_user, data.note if data else None)
    await create_activity_event(db, current_user.organization_id, "alert_acknowledged", "alert", f"Alert acknowledged: {alert.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(alert.id))
    await db.flush()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/escalate", response_model=AlertResponse)
async def escalate_alert(
    alert_id: str,
    data: AlertActionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = await get_scoped_alert(alert_id, db, current_user)
    if alert.status == AlertStatus.RESOLVED:
        raise HTTPException(status_code=409, detail="Resolved alerts cannot be escalated")
    alert.status = AlertStatus.ESCALATED
    append_alert_event(alert, "escalated", current_user, data.note if data else None)
    await create_activity_event(db, current_user.organization_id, "alert_escalated", "alert", f"Alert escalated: {alert.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(alert.id), severity="warning")
    await db.flush()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    data: AlertActionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alert = await get_scoped_alert(alert_id, db, current_user)
    alert.status = AlertStatus.RESOLVED
    append_alert_event(alert, "resolved", current_user, data.note if data else None)
    await create_activity_event(db, current_user.organization_id, "alert_resolved", "alert", f"Alert resolved: {alert.title}", actor_type="user", actor_id=str(current_user.id), entity_id=str(alert.id))
    await db.flush()
    await db.refresh(alert)
    return alert
