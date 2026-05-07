from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.user import User
from app.routers.alerts import acknowledge_alert, create_incident_from_alert, escalate_alert, get_scoped_alert, resolve_alert


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeSession:
    def __init__(self, value):
        self.value = value
        self.added = []
        self.flushes = 0
        self.refreshes = 0

    async def execute(self, _query):
        return _Result(self.value)

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.added.append(value)

    async def flush(self):
        self.flushes += 1

    async def refresh(self, _value):
        self.refreshes += 1


def user(org_id):
    return User(
        id=uuid4(),
        email="owner@example.com",
        hashed_password="x",
        full_name="Owner",
        organization_id=org_id,
    )


def alert(org_id):
    return Alert(
        id=uuid4(),
        title="Critical RF degradation",
        description="SNR below threshold",
        severity=AlertSeverity.CRITICAL,
        status=AlertStatus.OPEN,
        organization_id=org_id,
    )


@pytest.mark.asyncio
async def test_alert_lifecycle_acknowledge_escalate_resolve():
    org_id = uuid4()
    current_user = user(org_id)
    current_alert = alert(org_id)
    session = FakeSession(current_alert)

    acknowledged = await acknowledge_alert(str(current_alert.id), None, session, current_user)
    assert acknowledged.status == AlertStatus.ACKNOWLEDGED

    escalated = await escalate_alert(str(current_alert.id), None, session, current_user)
    assert escalated.status == AlertStatus.ESCALATED

    resolved = await resolve_alert(str(current_alert.id), None, session, current_user)
    assert resolved.status == AlertStatus.RESOLVED
    assert len(resolved.source_metadata["lifecycle_history"]) == 3


@pytest.mark.asyncio
async def test_incident_creation_from_alert_links_and_escalates_alert():
    org_id = uuid4()
    current_user = user(org_id)
    current_alert = alert(org_id)
    session = FakeSession(current_alert)

    result = await create_incident_from_alert(str(current_alert.id), session, current_user)

    assert result["created"] is True
    assert current_alert.incident_id is not None
    assert current_alert.status == AlertStatus.ESCALATED
    assert len(session.added) == 1


@pytest.mark.asyncio
async def test_cross_organization_alert_access_is_blocked():
    with pytest.raises(HTTPException) as exc:
        await get_scoped_alert(str(uuid4()), FakeSession(None), user(uuid4()))

    assert exc.value.status_code == 404
