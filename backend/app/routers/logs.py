"""
NetSentinel AI — Logs Router
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models.log import LogEntry, LogLevel
from app.schemas.log import LogEntryCreate, LogEntryRead, LogListResponse
from app.models.user import User
from app.security.auth import get_current_active_user
from app.services.threat_engine import ThreatEngine
from app.services.response_engine import ResponseEngine

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.post("/", response_model=LogEntryRead, status_code=status.HTTP_201_CREATED)
async def create_log_entry(
    log_in: LogEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Ingest a new log entry.
    In a production system, this might be handled by a fast-path ingestion pipeline 
    or background worker. For Phase 3, we expose it as a standard endpoint.
    """
    # Enforce organization isolation if user is not superadmin
    if not current_user.is_superuser and log_in.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot ingest logs for a different organization.",
        )

    log_obj = LogEntry(**log_in.model_dump(exclude_unset=True))
    db.add(log_obj)
    await db.commit()
    await db.refresh(log_obj)
    
    # Trigger threat detection engine
    threat_engine = ThreatEngine(db)
    alerts = await threat_engine.evaluate_log(log_obj)
    if alerts:
        db.add_all(alerts)
        await db.flush()
        
        # Trigger automation playbooks for newly generated alerts
        response_engine = ResponseEngine(db)
        for alert in alerts:
            await response_engine.evaluate_alert(alert)
            
        await db.commit()
    
    return log_obj


@router.get("/", response_model=LogListResponse)
async def list_logs(
    level: Optional[LogLevel] = None,
    source: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    organization_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Retrieve logs with filtering and pagination.
    """
    # Organization filtering
    target_org_id = organization_id
    if not current_user.is_superuser:
        target_org_id = current_user.organization_id
    elif not target_org_id:
        # If superuser and no org specified, we might require it or just show all.
        # For safety in SaaS, defaulting to user's org if none provided.
        target_org_id = current_user.organization_id

    stmt = select(LogEntry)
    if target_org_id:
        stmt = stmt.where(LogEntry.organization_id == target_org_id)
        
    if level:
        stmt = stmt.where(LogEntry.level == level)
    if source:
        stmt = stmt.where(LogEntry.source.ilike(f"%{source}%"))
    if asset_id:
        stmt = stmt.where(LogEntry.asset_id == asset_id)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one_or_none() or 0

    # Pagination and sorting
    stmt = stmt.order_by(desc(LogEntry.timestamp))
    stmt = stmt.offset((page - 1) * size).limit(size)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    return LogListResponse(
        items=list(logs),
        total=total,
        page=page,
        size=size
    )
