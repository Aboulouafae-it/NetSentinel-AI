"""
NetSentinel AI — Alerts Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.schemas.alert import AlertCreate, AlertUpdate, AlertResponse
from app.services.response_engine import ResponseEngine

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=list[AlertResponse])
async def list_alerts(
    organization_id: str | None = None,
    asset_id: str | None = None,
    severity: str | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List alerts with optional filters."""
    query = select(Alert).offset(skip).limit(limit).order_by(Alert.created_at.desc())
    if organization_id:
        query = query.where(Alert.organization_id == organization_id)
    if severity:
        query = query.where(Alert.severity == severity)
    if status:
        query = query.where(Alert.status == status)
    if asset_id:
        query = query.where(Alert.asset_id == asset_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats")
async def alert_stats(db: AsyncSession = Depends(get_db)):
    """Get alert summary statistics."""
    result = await db.execute(select(Alert))
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
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single alert by ID."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(data: AlertCreate, db: AsyncSession = Depends(get_db)):
    """Create a new alert."""
    alert = Alert(**data.model_dump())
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    
    # Trigger automation playbooks
    engine = ResponseEngine(db)
    await engine.evaluate_alert(alert)
    await db.commit()
    
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: str, data: AlertUpdate, db: AsyncSession = Depends(get_db)):
    """Update an existing alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)

    await db.flush()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)
