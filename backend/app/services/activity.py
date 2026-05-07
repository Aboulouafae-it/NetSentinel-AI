"""Normalized activity event helpers."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edge_agent import ActivityEvent, ActivitySeverity


async def create_activity_event(
    db: AsyncSession,
    organization_id,
    event_type: str,
    entity_type: str,
    message: str,
    actor_type: str = "system",
    actor_id: str | None = None,
    entity_id: str | None = None,
    severity: str = "info",
    metadata: dict | None = None,
) -> ActivityEvent:
    event = ActivityEvent(
        organization_id=organization_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        message=message,
        severity=ActivitySeverity(severity),
        metadata_json=metadata,
    )
    db.add(event)
    await db.flush()
    return event
