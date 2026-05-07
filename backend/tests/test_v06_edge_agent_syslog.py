from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.asset import Asset, AssetStatus
from app.models.edge_agent import ActivityEvent, ActivitySeverity, EdgeAgent, EdgeAgentStatus
from app.models.site import Site
from app.routers.agents import authenticate_agent, heartbeat, register_agent
from app.routers.dashboard import dashboard_recent_activity
from app.routers.syslog import SyslogIngestRequest, ingest_syslog
from app.schemas.agent import AgentHeartbeatRequest, AgentRegisterRequest
from app.services.agent_security import hash_agent_token
from app.services.scheduled_polling import mark_stale_assets
from app.services.telemetry_processor import process_asset_telemetry


class Result:
    def __init__(self, values):
        self.values = values if isinstance(values, list) else [values] if values else []

    def scalar_one_or_none(self):
        return self.values[0] if self.values else None

    def scalars(self):
        return self

    def all(self):
        return self.values


class FakeSession:
    def __init__(self, scalars=None):
        self.scalars_queue = list(scalars or [])
        self.added = []

    async def scalar(self, _query):
        if self.scalars_queue:
            value = self.scalars_queue.pop(0)
            return value[0] if isinstance(value, list) else value
        return None

    async def execute(self, _query):
        if self.scalars_queue:
            return Result(self.scalars_queue.pop(0))
        return Result([])

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        if getattr(value, "created_at", None) is None:
            value.created_at = datetime.now(timezone.utc)
            value.updated_at = value.created_at
        self.added.append(value)

    async def flush(self):
        pass

    async def refresh(self, _value):
        pass


def agent(org_id=None, revoked=False):
    now = datetime.now(timezone.utc)
    return EdgeAgent(
        id=uuid4(),
        organization_id=org_id or uuid4(),
        name="edge-1",
        agent_uid="agent-1",
        token_hash=hash_agent_token("secret"),
        status=EdgeAgentStatus.UNKNOWN,
        revoked_at=now if revoked else None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_agent_registration_returns_token_once_and_stores_hash():
    org_id = uuid4()
    current_user = SimpleNamespace(id=uuid4(), organization_id=org_id)
    session = FakeSession([None])

    result = await register_agent(AgentRegisterRequest(name="edge-new", agent_uid="edge-new"), session, current_user)

    assert result["agent_uid"] == "edge-new"
    assert result["token"]
    stored_agent = next(item for item in session.added if isinstance(item, EdgeAgent))
    assert stored_agent.token_hash != result["token"]


@pytest.mark.asyncio
async def test_agent_valid_heartbeat_updates_last_seen():
    current_agent = agent()
    session = FakeSession([current_agent])

    result = await heartbeat(
        AgentHeartbeatRequest(status="healthy", hostname="edge-host", version="0.6.0"),
        session,
        x_agent_uid="agent-1",
        x_agent_token="secret",
    )

    assert result["status"] == "accepted"
    assert current_agent.last_seen is not None
    assert current_agent.hostname == "edge-host"
    assert current_agent.status == EdgeAgentStatus.HEALTHY


@pytest.mark.asyncio
async def test_agent_invalid_token_rejected():
    with pytest.raises(HTTPException) as exc:
        await authenticate_agent(FakeSession([agent()]), "agent-1", "bad")

    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_revoked_agent_rejected():
    with pytest.raises(HTTPException) as exc:
        await authenticate_agent(FakeSession([agent(revoked=True)]), "agent-1", "secret")

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_telemetry_updates_asset_last_seen_and_activity():
    org_id = uuid4()
    current_asset = Asset(id=uuid4(), hostname="router-1", ip_address="10.0.0.1", status=AssetStatus.UNKNOWN, site_id=uuid4())
    payload = SimpleNamespace(asset_id=str(current_asset.id), ip_address=None, metric_type="latency_ms", value=12.5, timestamp=datetime.now(timezone.utc).isoformat())
    session = FakeSession([current_asset])

    asset = await process_asset_telemetry(session, org_id, payload, actor_id="agent-id")

    assert asset is current_asset
    assert current_asset.last_seen is not None
    assert current_asset.last_poll_latency_ms == 12.5
    assert current_asset.last_telemetry_source == "agent:agent-id"
    assert any(isinstance(item, ActivityEvent) for item in session.added)


@pytest.mark.asyncio
async def test_syslog_ingestion_saves_log_and_creates_alert_activity(monkeypatch):
    org_id = uuid4()
    current_agent = agent(org_id)
    session = FakeSession([current_agent, None, None])

    result = await ingest_syslog(
        SyslogIngestRequest(source_ip="10.0.0.5", severity="error", message="interface down on ether1"),
        session,
        x_agent_uid="agent-1",
        x_agent_token="secret",
    )

    assert result["status"] == "stored"
    assert any(item.__class__.__name__ == "LogEntry" for item in session.added)
    assert any(item.__class__.__name__ == "Alert" for item in session.added)
    assert any(isinstance(item, ActivityEvent) for item in session.added)


@pytest.mark.asyncio
async def test_scheduled_polling_marks_stale_assets():
    stale = Asset(id=uuid4(), hostname="stale", ip_address="10.0.0.2", status=AssetStatus.ONLINE, site_id=uuid4())
    stale.last_seen = datetime.now(timezone.utc) - timedelta(hours=2)
    session = FakeSession([[stale]])

    count = await mark_stale_assets(session, uuid4(), stale_after_minutes=30)

    assert count == 1
    assert stale.status == AssetStatus.OFFLINE


@pytest.mark.asyncio
async def test_dashboard_recent_activity_prefers_activity_events():
    org_id = uuid4()
    event = ActivityEvent(
        id=uuid4(),
        organization_id=org_id,
        actor_type="agent",
        event_type="syslog_ingested",
        entity_type="log",
        message="Syslog received",
        severity=ActivitySeverity.INFO,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session = FakeSession([[event]])
    current_user = SimpleNamespace(organization_id=org_id)

    result = await dashboard_recent_activity(10, session, current_user)

    assert result[0]["event"] == "syslog_ingested"
    assert result[0]["title"] == "Syslog received"
