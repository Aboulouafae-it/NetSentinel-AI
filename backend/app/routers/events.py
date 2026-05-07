"""Real-time event stream endpoints."""

import asyncio
import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.edge_agent import ActivityEvent
from app.models.user import User
from app.security import decode_access_token

router = APIRouter(prefix="/events", tags=["Events"])

STREAM_POLL_SECONDS = 2
STREAM_KEEPALIVE_SECONDS = 15


def activity_to_event_type(activity_type: str) -> str:
    mapping = {
        "alert_created": "alert_created",
        "alert_acknowledged": "alert_updated",
        "alert_escalated": "alert_updated",
        "alert_resolved": "alert_updated",
        "incident_created": "incident_created",
        "incident_resolved": "incident_updated",
        "incident_assigned": "incident_updated",
        "incident_note_added": "incident_updated",
        "incident_task_added": "incident_updated",
        "incident_task_updated": "incident_updated",
        "agent_registered": "activity_created",
        "agent_heartbeat": "agent_heartbeat",
        "syslog_ingested": "syslog_ingested",
        "asset_polled": "asset_polled",
        "radio_polled": "radio_polled",
        "field_measurement_saved": "field_measurement_created",
    }
    return mapping.get(activity_type, "activity_created")


def event_payload(event: ActivityEvent) -> dict:
    metadata = event.metadata_json or {}
    safe_metadata = {
        key: value
        for key, value in metadata.items()
        if "token" not in key.lower() and "secret" not in key.lower() and "password" not in key.lower()
    }
    return {
        "id": str(event.id),
        "event_type": event.event_type,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "message": event.message,
        "severity": event.severity.value if hasattr(event.severity, "value") else str(event.severity),
        "actor_type": event.actor_type,
        "actor_id": event.actor_id,
        "metadata": safe_metadata,
        "created_at": event.created_at.isoformat() if event.created_at else datetime.now(timezone.utc).isoformat(),
    }


async def get_stream_user(token: str, db: AsyncSession) -> User:
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    user = await db.scalar(select(User).options(selectinload(User.organization)).where(User.id == payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def recent_org_events(db: AsyncSession, organization_id: UUID, after: datetime | None, limit: int = 25) -> list[ActivityEvent]:
    stmt = select(ActivityEvent).where(ActivityEvent.organization_id == organization_id)
    if after:
        stmt = stmt.where(ActivityEvent.created_at > after)
    stmt = stmt.order_by(ActivityEvent.created_at.asc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/stream")
async def stream_events(
    request: Request,
    token: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """Stream organization-scoped activity events as SSE.

    EventSource cannot set Authorization headers in browsers, so the MVP uses a
    short-lived access token query parameter. Payloads are intentionally small
    and scrub secret-like metadata keys before emission.
    """
    current_user = await get_stream_user(token, db)

    async def generator():
        last_seen: datetime | None = datetime.now(timezone.utc)
        last_keepalive = datetime.now(timezone.utc)
        yield "event: connected\ndata: {\"status\":\"connected\"}\n\n"
        while not await request.is_disconnected():
            events = await recent_org_events(db, current_user.organization_id, last_seen)
            for event in events:
                event_name = activity_to_event_type(event.event_type)
                payload = event_payload(event)
                last_seen = event.created_at or datetime.now(timezone.utc)
                yield f"id: {payload['id']}\nevent: {event_name}\ndata: {json.dumps(payload, default=str)}\n\n"

            now = datetime.now(timezone.utc)
            if (now - last_keepalive).total_seconds() >= STREAM_KEEPALIVE_SECONDS:
                last_keepalive = now
                yield "event: keepalive\ndata: {\"status\":\"ok\"}\n\n"
            await asyncio.sleep(STREAM_POLL_SECONDS)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
