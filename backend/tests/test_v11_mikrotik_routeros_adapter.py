from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.adapters.mikrotik_routeros import MikroTikRouterOSAdapter
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import AdapterType, DeviceVendor, RadioDevice
from app.routers.credentials import get_credential
from app.schemas.credential import credential_response
from app.services.polling import poll_radio_device
from app.services.vendor_adapters import select_adapter


class FakeRouterOSClient:
    def __init__(self, responses=None, error=None, **_kwargs):
        self.responses = responses or {}
        self.error = error

    async def run(self, command: str, **_params):
        if self.error:
            raise RuntimeError(self.error)
        return self.responses.get(command, [])


def client_factory(responses=None, error=None):
    return lambda **kwargs: FakeRouterOSClient(responses=responses, error=error, **kwargs)


def responses():
    return {
        "/system/identity/print": [{"name": "mt-edge-1"}],
        "/system/resource/print": [{
            "board-name": "LHG 5",
            "version": "7.14",
            "uptime": "1w2d",
            "platform": "MikroTik",
            "cpu-load": "12",
            "free-memory": "75000000",
            "total-memory": "100000000",
        }],
        "/interface/print": [
            {"name": "ether1", "type": "ether", "running": "true", "disabled": "false", "rx-byte": "100", "tx-byte": "200", "rx-error": "0", "tx-error": "0"},
            {"name": "wlan1", "type": "wlan", "running": "false", "disabled": "false", "rx-byte": "300", "tx-byte": "400", "rx-error": "2", "tx-error": "1"},
        ],
        "/interface/wireless/registration-table/print": [{
            "signal-strength": "-58dBm",
            "signal-to-noise": "31",
            "noise-floor": "-96",
            "tx-ccq": "97%",
            "tx-rate": "144.4Mbps",
            "rx-rate": "130Mbps",
            "frequency": "5805",
            "channel-width": "20",
        }],
    }


@pytest.mark.asyncio
async def test_mikrotik_connection_success_and_failure():
    adapter = MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory(responses()))
    failed = MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory(error="refused"))

    assert (await adapter.test_connection()).online is True
    assert (await failed.test_connection()).online is False


@pytest.mark.asyncio
async def test_mikrotik_device_info_interface_health_normalization():
    adapter = MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory(responses()))

    info = await adapter.get_device_info()
    interfaces = await adapter.get_interfaces()
    health = await adapter.get_health()

    assert info.name == "mt-edge-1"
    assert info.model == "LHG 5"
    assert interfaces[1].oper_status == "down"
    assert interfaces[1].in_errors == 2
    assert health.metadata["cpu_load_percent"] == 12.0
    assert health.metadata["memory_used_percent"] == 25.0


@pytest.mark.asyncio
async def test_mikrotik_wireless_metrics_and_partial_missing_fields():
    full = MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory(responses()))
    partial = MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory({"/system/identity/print": [{"name": "mt"}]}))

    full_snapshot = await full.get_wireless_metrics()
    partial_snapshot = await partial.get_wireless_metrics()

    assert full_snapshot.rssi_dbm == -58
    assert full_snapshot.ccq_percent == 97
    assert full_snapshot.frequency_mhz == 5805
    assert "rssi_dbm" in partial_snapshot.missing_fields


def test_mikrotik_adapter_selection_for_routeros_credentials():
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="mt", ip_address="192.0.2.10", vendor=DeviceVendor.MIKROTIK, adapter_type=AdapterType.MIKROTIK_ROUTEROS)
    credential = CredentialProfile(organization_id=radio.organization_id, name="routeros", credential_type=CredentialType.ROUTEROS, username="admin", secret_material="secret", config={"port": 8728})

    adapter = select_adapter(radio, credential, poller=client_factory(responses()))

    assert isinstance(adapter, MikroTikRouterOSAdapter)
    assert adapter.get_capabilities().supports_logs is True
    assert adapter.get_capabilities().supports_configuration is False


def test_routeros_secret_not_returned_in_credential_response():
    profile = CredentialProfile(id=uuid4(), organization_id=uuid4(), name="routeros", credential_type=CredentialType.ROUTEROS, username="admin", secret_material="secret", config={"port": 8728}, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))

    response = credential_response(profile)

    assert response["has_secret"] is True
    assert "secret_material" not in response


@pytest.mark.asyncio
async def test_routeros_credential_org_isolation():
    current_user = SimpleNamespace(organization_id=uuid4())
    class EmptySession:
        async def scalar(self, _query):
            return None

    with pytest.raises(HTTPException) as exc:
        await get_credential(str(uuid4()), EmptySession(), current_user)

    assert exc.value.status_code == 404


class QueueSession:
    def __init__(self, values=None):
        self.values = list(values or [])
        self.added = []

    async def scalar(self, _query):
        return self.values.pop(0) if self.values else None

    def add(self, value):
        if getattr(value, "id", None) is None:
            value.id = uuid4()
        self.added.append(value)

    async def flush(self):
        pass


@pytest.mark.asyncio
async def test_mikrotik_connection_failure_alert_dedupes(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="mt", ip_address="192.0.2.10", vendor=DeviceVendor.MIKROTIK, adapter_type=AdapterType.MIKROTIK_ROUTEROS)
    credential = CredentialProfile(organization_id=radio.organization_id, name="routeros", credential_type=CredentialType.ROUTEROS, username="admin", secret_material="secret")
    existing = Alert(id=uuid4(), title="Adapter connection failed", severity=AlertSeverity.HIGH, status=AlertStatus.OPEN, organization_id=radio.organization_id, dedupe_key=f"radio_adapter:connection_failure:{radio.id}", occurrence_count=1)

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=1.0, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    monkeypatch.setattr("app.services.polling.select_adapter", lambda *_args, **_kwargs: MikroTikRouterOSAdapter("192.0.2.10", "admin", "secret", client_factory=client_factory(error="refused")))

    await poll_radio_device(QueueSession([existing]), radio, credential)

    assert existing.occurrence_count == 2
    assert radio.last_poll_error == "refused"
