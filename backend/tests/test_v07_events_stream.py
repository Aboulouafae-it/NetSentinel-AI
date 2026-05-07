from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.edge_agent import ActivityEvent, ActivitySeverity
from app.models.user import User
from app.routers.events import activity_to_event_type, event_payload, get_stream_user, recent_org_events
from app.security import create_access_token


class Result:
    def __init__(self, values):
        self.values = values

    def scalar_one_or_none(self):
        return self.values[0] if self.values else None

    def scalars(self):
        return self

    def all(self):
        return self.values


class FakeSession:
    def __init__(self, values):
        self.values = list(values)

    async def scalar(self, _query):
        return self.values.pop(0) if self.values else None

    async def execute(self, _query):
        value = self.values.pop(0) if self.values else []
        return Result(value if isinstance(value, list) else [value])


def make_user(org_id):
    return User(id=uuid4(), email="operator@example.com", full_name="Operator", hashed_password="x", organization_id=org_id, is_active=True)


def make_event(org_id, metadata=None):
    return ActivityEvent(
        id=uuid4(),
        organization_id=org_id,
        actor_type="agent",
        actor_id="agent-1",
        event_type="syslog_ingested",
        entity_type="log",
        entity_id=str(uuid4()),
        message="Syslog ingested",
        severity=ActivitySeverity.INFO,
        metadata_json=metadata or {},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.mark.asyncio
async def test_event_stream_token_auth_loads_active_user():
    org_id = uuid4()
    user = make_user(org_id)
    token = create_access_token({"sub": str(user.id)})

    result = await get_stream_user(token, FakeSession([user]))

    assert result.organization_id == org_id


@pytest.mark.asyncio
async def test_event_stream_rejects_bad_token():
    with pytest.raises(HTTPException) as exc:
        await get_stream_user("bad-token", FakeSession([]))

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_recent_org_events_returns_scoped_query_results():
    org_id = uuid4()
    event = make_event(org_id)

    result = await recent_org_events(FakeSession([[event]]), org_id, None)

    assert result == [event]


def test_event_payload_scrubs_secret_like_metadata():
    payload = event_payload(make_event(uuid4(), {"token": "secret", "safe": "ok", "password_hint": "no"}))

    assert payload["metadata"] == {"safe": "ok"}


def test_activity_event_type_mapping():
    assert activity_to_event_type("alert_acknowledged") == "alert_updated"
    assert activity_to_event_type("agent_heartbeat") == "agent_heartbeat"
    assert activity_to_event_type("field_measurement_saved") == "field_measurement_created"
