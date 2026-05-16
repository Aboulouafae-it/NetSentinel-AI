"""Normalized activity event helpers."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.edge_agent import ActivityEvent, ActivitySeverity

SENSITIVE_METADATA_MARKERS = (
    "api_key",
    "auth",
    "community",
    "credential",
    "jwt",
    "key",
    "password",
    "secret",
    "snmp",
    "token",
)


def scrub_sensitive_metadata(value):
    """Redact token-like metadata before it is persisted to activity events."""
    if isinstance(value, dict):
        scrubbed = {}
        for key, item in value.items():
            lowered = str(key).lower()
            if any(marker in lowered for marker in SENSITIVE_METADATA_MARKERS):
                scrubbed[key] = "[redacted]"
            else:
                scrubbed[key] = scrub_sensitive_metadata(item)
        return scrubbed
    if isinstance(value, list):
        return [scrub_sensitive_metadata(item) for item in value]
    if isinstance(value, str):
        lowered = value.lower()
        if any(marker in lowered for marker in ("bearer ", "token=", "password=", "secret=", "apikey=", "api_key=")):
            return "[redacted]"
    return value


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
        metadata_json=scrub_sensitive_metadata(metadata) if metadata is not None else None,
    )
    db.add(event)
    await db.flush()
    return event
