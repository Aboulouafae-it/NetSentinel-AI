from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models.edge_agent import EdgeAgent, EdgeAgentStatus
from app.models.organization import Organization
from app.models.user import UserRole
from app.routers.agents import authenticate_agent, rotate_agent_token
from app.routers.setup import FirstRunSetupRequest, first_run_setup, setup_status
from app.services.agent_security import hash_agent_token


class FakeSession:
    def __init__(self, scalars=None):
        self.scalars = list(scalars or [])
        self.added = []

    async def scalar(self, _query):
        return self.scalars.pop(0) if self.scalars else None

    async def execute(self, _query):
        value = self.scalars.pop(0) if self.scalars else None
        return SimpleNamespace(scalar_one_or_none=lambda: value)

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.added.append(value)

    async def flush(self):
        pass

    async def refresh(self, _value):
        pass


def make_agent(org_id):
    return EdgeAgent(
        id=uuid4(),
        organization_id=org_id,
        name="edge-1",
        agent_uid="edge-1",
        token_hash=hash_agent_token("old-token"),
        status=EdgeAgentStatus.HEALTHY,
    )


@pytest.mark.asyncio
async def test_setup_status_reports_uninitialized():
    result = await setup_status(FakeSession([0, 0]))

    assert result.initialized is False


@pytest.mark.asyncio
async def test_first_run_setup_creates_org_and_admin_tokens():
    session = FakeSession([0, 0])

    result = await first_run_setup(
        FirstRunSetupRequest(
            organization_name="North Plant",
            admin_email="admin@example.com",
            admin_full_name="Admin User",
            admin_password="very-secure-password",
        ),
        session,
    )

    assert result.access_token
    assert any(isinstance(item, Organization) for item in session.added)
    admin = next(item for item in session.added if getattr(item, "email", None) == "admin@example.com")
    assert admin.role == UserRole.ADMIN


@pytest.mark.asyncio
async def test_first_run_setup_cannot_run_after_initialization():
    with pytest.raises(HTTPException) as exc:
        await first_run_setup(
            FirstRunSetupRequest(
                organization_name="North Plant",
                admin_email="admin@example.com",
                admin_full_name="Admin User",
                admin_password="very-secure-password",
            ),
            FakeSession([1, 1]),
        )

    assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_agent_token_rotation_rejects_old_token():
    org_id = uuid4()
    current_agent = make_agent(org_id)
    session = FakeSession([current_agent])
    user = SimpleNamespace(id=uuid4(), organization_id=org_id)

    rotated = await rotate_agent_token(str(current_agent.id), session, user)

    assert rotated["token"] != "old-token"
    with pytest.raises(HTTPException):
        await authenticate_agent(FakeSession([current_agent]), "edge-1", "old-token")


def test_production_config_rejects_unsafe_defaults():
    settings = Settings(environment="production", debug=False, cors_origins=["https://netsentinel.local"])

    assert any("SECRET_KEY" in item for item in settings.production_config_errors())


def test_backup_restore_scripts_exist_and_are_executable():
    root = Path(__file__).resolve().parents[2]
    for path in [root / "scripts" / "backup.sh", root / "scripts" / "restore.sh"]:
        assert path.exists()
        assert path.stat().st_mode & 0o111
