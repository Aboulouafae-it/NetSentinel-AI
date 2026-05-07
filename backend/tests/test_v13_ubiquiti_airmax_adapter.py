from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.adapters.ubiquiti_airmax import UbiquitiAirMaxAdapter, detect_ubiquiti_family
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import AdapterType, DeviceVendor, RadioDevice
from app.services.polling import poll_radio_device
from app.services.vendor_adapters import diagnose_wireless_snapshot, select_adapter


def snmp_result(data, ok=True, error=None):
    return SimpleNamespace(ok=ok, data=data, error=error)


async def basic_poller(_ip, _community, timeout=3):
    return snmp_result({
        "sysName": "pbe-a",
        "sysDescr": "Ubiquiti PowerBeam 5AC airMAX",
        "sysUpTime": "12345",
        "interface_names": ["eth0", "ath0"],
        "interface_status": ["1", "1"],
        "interface_in_octets": ["100", "200"],
        "interface_out_octets": ["300", "400"],
    })


async def rf_poller(_ip, _community, timeout=3):
    result = await basic_poller(_ip, _community, timeout)
    result.data.update({
        "ubnt_rssi_dbm": "-57",
        "ubnt_snr_db": "33",
        "ubnt_noise_floor_dbm": "-95",
        "ubnt_airmax_quality_percent": "94",
        "ubnt_airmax_capacity_percent": "88",
        "ubnt_tx_rate_mbps": "240",
        "ubnt_rx_rate_mbps": "180",
        "ubnt_frequency_mhz": "5805",
        "ubnt_channel_width_mhz": "40",
        "ubnt_link_distance_km": "4.2",
    })
    return result


@pytest.mark.asyncio
async def test_ubiquiti_adapter_falls_back_to_generic_snmp():
    adapter = UbiquitiAirMaxAdapter("192.0.2.30", "public", poller=basic_poller)

    info = await adapter.get_device_info()
    interfaces = await adapter.get_interfaces()
    health = await adapter.test_connection()

    assert health.online is True
    assert info.name == "pbe-a"
    assert info.model == "powerbeam"
    assert interfaces[1].name == "ath0"


@pytest.mark.asyncio
async def test_ubiquiti_no_fake_wireless_metrics_when_unavailable():
    adapter = UbiquitiAirMaxAdapter("192.0.2.30", "public", poller=basic_poller)

    snapshot = await adapter.get_wireless_metrics()
    diagnosis = diagnose_wireless_snapshot(snapshot)

    assert snapshot.source == "ubiquiti_airmax_snmp"
    assert snapshot.rssi_dbm is None
    assert "rssi_dbm" in snapshot.missing_fields
    assert diagnosis["partial"] is True


@pytest.mark.asyncio
async def test_ubiquiti_fixture_wireless_metrics_parsing():
    adapter = UbiquitiAirMaxAdapter("192.0.2.30", "public", poller=rf_poller)

    snapshot = await adapter.get_wireless_metrics()

    assert snapshot.rssi_dbm == -57
    assert snapshot.ccq_percent == 94
    assert snapshot.airmax_capacity_percent == 88
    assert snapshot.link_distance_km == 4.2


def test_ubiquiti_selection_and_capabilities_are_honest():
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="pbe", ip_address="192.0.2.30", vendor=DeviceVendor.UBIQUITI, adapter_type=AdapterType.UBIQUITI_AIRMAX)
    credential = CredentialProfile(organization_id=radio.organization_id, name="snmp", credential_type=CredentialType.SNMP_V2C, secret_material="public")

    adapter = select_adapter(radio, credential, poller=basic_poller)
    caps = adapter.get_capabilities()

    assert isinstance(adapter, UbiquitiAirMaxAdapter)
    assert caps.supports_ping is True
    assert caps.supports_snmp is True
    assert caps.supports_wireless_metrics is False
    assert caps.supports_uisp_api is False
    assert caps.supports_configuration is False


def test_ubiquiti_family_detection():
    assert detect_ubiquiti_family("Ubiquiti NanoBeam 5AC") == "nanobeam"
    assert detect_ubiquiti_family("UISP LTU Rocket") == "rocket"


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
async def test_ubiquiti_offline_alert_dedupes(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="pbe", ip_address="192.0.2.30", vendor=DeviceVendor.UBIQUITI, adapter_type=AdapterType.UBIQUITI_AIRMAX)
    existing = Alert(id=uuid4(), title="Radio unreachable", severity=AlertSeverity.HIGH, status=AlertStatus.OPEN, organization_id=radio.organization_id, dedupe_key=f"polling_offline:radio:{radio.id}", occurrence_count=1)

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=False, latency_ms=None, packet_loss_percent=100.0, checked_at=datetime.now(timezone.utc), error_message="timeout")

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)

    await poll_radio_device(QueueSession([existing]), radio)

    assert existing.occurrence_count == 2
    assert radio.is_online is False


@pytest.mark.asyncio
async def test_ubiquiti_missing_rf_alert_when_configured(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="pbe", ip_address="192.0.2.30", vendor=DeviceVendor.UBIQUITI, adapter_type=AdapterType.UBIQUITI_AIRMAX)
    credential = CredentialProfile(organization_id=radio.organization_id, name="snmp", credential_type=CredentialType.SNMP_V2C, secret_material="public")

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=2.0, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    monkeypatch.setattr("app.services.polling.select_adapter", lambda *_args, **_kwargs: UbiquitiAirMaxAdapter("192.0.2.30", "public", poller=basic_poller))

    session = QueueSession()
    await poll_radio_device(session, radio, credential)

    assert any(getattr(item, "rule_name", "") == "missing_wireless_metrics" for item in session.added)
    assert radio.latest_wireless_metrics["diagnosis"]["partial"] is True
