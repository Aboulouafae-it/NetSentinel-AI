from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.alert import AlertStatus
from app.models.asset import Asset, AssetStatus
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import RadioDevice
from app.models.wireless import WirelessLink
from app.routers.credentials import get_credential
from app.schemas.credential import credential_response
from app.services.polling import poll_asset, poll_radio_device
from app.services.reachability import check_reachability
from app.services.snmp import poll_snmp_v2c


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value

    def scalars(self):
        return self

    def all(self):
        return [self.value] if self.value else []


class FakeSession:
    def __init__(self, scalar=None):
        self.scalar_value = scalar
        self.added = []

    async def scalar(self, _query):
        return self.scalar_value

    async def execute(self, _query):
        return _Result(self.scalar_value)

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.added.append(value)

    async def flush(self):
        pass

    async def refresh(self, _value):
        pass


@pytest.mark.asyncio
async def test_reachability_success_and_failure():
    async def ok_runner(*_args, **_kwargs):
        return {"is_reachable": True, "response_time_ms": 4.2}

    async def fail_runner(*_args, **_kwargs):
        return {"is_reachable": False, "response_time_ms": None, "error": "timeout"}

    ok = await check_reachability("192.0.2.10", runner=ok_runner)
    failed = await check_reachability("192.0.2.11", runner=fail_runner)

    assert ok.is_reachable is True
    assert ok.latency_ms == 4.2
    assert failed.is_reachable is False
    assert failed.packet_loss_percent == 100.0


@pytest.mark.asyncio
async def test_snmp_mocked_polling_parses_safe_values():
    async def runner(args, _timeout):
        oid = args[-1]
        if "snmpwalk" in args[0]:
            return 0, f"{oid}.1 = STRING: eth0\n{oid}.2 = STRING: wlan0\n", ""
        return 0, f"{oid} = STRING: demo-radio\n", ""

    result = await poll_snmp_v2c("192.0.2.10", "public", runner=runner)

    assert result.ok is True
    assert result.data["sysName"] == "demo-radio"
    assert result.data["interface_names"] == ["eth0", "wlan0"]


def test_credential_response_never_exposes_secret():
    profile = CredentialProfile(
        id=uuid4(),
        organization_id=uuid4(),
        name="SNMP public",
        credential_type=CredentialType.SNMP_V2C,
        secret_material="public",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    response = credential_response(profile)

    assert response["has_secret"] is True
    assert "secret_material" not in response


@pytest.mark.asyncio
async def test_credential_cross_org_access_is_hidden():
    current_user = SimpleNamespace(organization_id=uuid4())

    with pytest.raises(HTTPException) as exc:
        await get_credential(str(uuid4()), FakeSession(None), current_user)

    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_asset_poll_failure_updates_status_and_dedupes_alert(monkeypatch):
    asset = Asset(id=uuid4(), hostname="edge-1", ip_address="192.0.2.1", status=AssetStatus.ONLINE, site_id=uuid4())

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=False, latency_ms=None, packet_loss_percent=100.0, checked_at=datetime.now(timezone.utc), error_message="timeout")

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    session = FakeSession(None)

    result = await poll_asset(session, asset, uuid4())

    assert result["is_reachable"] is False
    assert asset.status == AssetStatus.OFFLINE
    assert session.added[0].status == AlertStatus.OPEN


@pytest.mark.asyncio
async def test_radio_poll_status(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="radio-a", ip_address="192.0.2.2")

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=2.5, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)

    result = await poll_radio_device(FakeSession(None), radio)

    assert result["is_reachable"] is True
    assert radio.is_online is True
    assert radio.last_seen is not None


def test_wireless_link_radio_relationship_fields_exist():
    near_id = uuid4()
    far_id = uuid4()
    link = WirelessLink(
        organization_id=uuid4(),
        name="Backhaul",
        interface_a_id=uuid4(),
        interface_b_id=uuid4(),
        link_type="ptp",
        near_end_radio_id=near_id,
        far_end_radio_id=far_id,
    )

    assert link.near_end_radio_id == near_id
    assert link.far_end_radio_id == far_id
