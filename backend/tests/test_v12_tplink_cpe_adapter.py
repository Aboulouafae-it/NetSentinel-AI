from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.adapters.tplink_cpe import TPLinkCpeAdapter
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import AdapterType, DeviceVendor, RadioDevice
from app.routers.credentials import get_credential
from app.services.outdoor_radio import outdoor_profile_for_radio
from app.services.polling import poll_radio_device
from app.services.vendor_adapters import diagnose_wireless_snapshot, select_adapter


def snmp_result(data, ok=True, error=None):
    return SimpleNamespace(ok=ok, data=data, error=error)


async def basic_poller(_ip, _community, timeout=3):
    return snmp_result({
        "sysName": "cpe710-a",
        "sysDescr": "TP-Link CPE710 Outdoor CPE",
        "sysUpTime": "12345",
        "interface_names": ["eth0", "wlan0"],
        "interface_status": ["1", "1"],
        "interface_in_octets": ["100", "200"],
        "interface_out_octets": ["300", "400"],
    })


async def rf_poller(_ip, _community, timeout=3):
    result = await basic_poller(_ip, _community, timeout)
    result.data.update({
        "tplink_rssi_dbm": "-61",
        "tplink_snr_db": "28",
        "tplink_noise_floor_dbm": "-94",
        "tplink_link_quality_percent": "91",
        "tplink_tx_rate_mbps": "144",
        "tplink_rx_rate_mbps": "130",
        "tplink_frequency_mhz": "5805",
        "tplink_channel_width_mhz": "20",
    })
    return result


async def failed_poller(_ip, _community, timeout=3):
    return snmp_result({}, ok=False, error="timeout")


@pytest.mark.asyncio
async def test_tplink_adapter_falls_back_to_generic_snmp_data():
    adapter = TPLinkCpeAdapter("192.0.2.20", "public", poller=basic_poller)

    info = await adapter.get_device_info()
    interfaces = await adapter.get_interfaces()
    health = await adapter.test_connection()

    assert health.online is True
    assert info.name == "cpe710-a"
    assert info.model == "TP-Link CPE"
    assert interfaces[1].name == "wlan0"


@pytest.mark.asyncio
async def test_tplink_does_not_fake_wireless_metrics_when_oids_missing():
    adapter = TPLinkCpeAdapter("192.0.2.20", "public", poller=basic_poller)

    snapshot = await adapter.get_wireless_metrics()
    diagnosis = diagnose_wireless_snapshot(snapshot)

    assert snapshot.source == "tplink_cpe_snmp"
    assert snapshot.rssi_dbm is None
    assert "rssi_dbm" in snapshot.missing_fields
    assert diagnosis["partial"] is True


@pytest.mark.asyncio
async def test_tplink_wireless_metrics_from_explicit_fixture_data():
    adapter = TPLinkCpeAdapter("192.0.2.20", "public", poller=rf_poller)

    snapshot = await adapter.get_wireless_metrics()

    assert snapshot.rssi_dbm == -61
    assert snapshot.ccq_percent == 91
    assert snapshot.frequency_mhz == 5805


def test_tplink_adapter_selection_and_capabilities_are_honest():
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="cpe", ip_address="192.0.2.20", vendor=DeviceVendor.TPLINK, adapter_type=AdapterType.TPLINK_CPE)
    credential = CredentialProfile(organization_id=radio.organization_id, name="snmp", credential_type=CredentialType.SNMP_V2C, secret_material="public")

    adapter = select_adapter(radio, credential, poller=basic_poller)
    capabilities = adapter.get_capabilities()

    assert isinstance(adapter, TPLinkCpeAdapter)
    assert capabilities.supports_ping is True
    assert capabilities.supports_snmp is True
    assert capabilities.supports_wireless_metrics is False
    assert capabilities.supports_configuration is False


def test_outdoor_radio_profile_manual_fallback():
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="cpe", ip_address="192.0.2.20", vendor=DeviceVendor.TPLINK, adapter_type=AdapterType.TPLINK_CPE, frequency_mhz=5805, channel_width_mhz=20)

    profile = outdoor_profile_for_radio(radio, source="tplink_cpe_snmp", wireless_available=False)

    assert profile.frequency_band == "5GHz"
    assert profile.manual_rf_measurement_fallback is True
    assert profile.automatic_metrics_source is None


@pytest.mark.asyncio
async def test_tplink_credential_org_isolation():
    class EmptySession:
        async def scalar(self, _query):
            return None

    with pytest.raises(HTTPException) as exc:
        await get_credential(str(uuid4()), EmptySession(), SimpleNamespace(organization_id=uuid4()))

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
async def test_tplink_offline_alert_dedupes(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="cpe", ip_address="192.0.2.20", vendor=DeviceVendor.TPLINK, adapter_type=AdapterType.TPLINK_CPE)
    existing = Alert(id=uuid4(), title="Radio unreachable", severity=AlertSeverity.HIGH, status=AlertStatus.OPEN, organization_id=radio.organization_id, dedupe_key=f"polling_offline:radio:{radio.id}", occurrence_count=1)

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=False, latency_ms=None, packet_loss_percent=100.0, checked_at=datetime.now(timezone.utc), error_message="timeout")

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)

    await poll_radio_device(QueueSession([existing]), radio)

    assert existing.occurrence_count == 2
    assert radio.is_online is False


@pytest.mark.asyncio
async def test_tplink_missing_wireless_metrics_alert_when_configured(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="cpe", ip_address="192.0.2.20", vendor=DeviceVendor.TPLINK, adapter_type=AdapterType.TPLINK_CPE)
    credential = CredentialProfile(organization_id=radio.organization_id, name="snmp", credential_type=CredentialType.SNMP_V2C, secret_material="public")

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=2.0, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    monkeypatch.setattr("app.services.polling.select_adapter", lambda *_args, **_kwargs: TPLinkCpeAdapter("192.0.2.20", "public", poller=basic_poller))

    session = QueueSession()
    await poll_radio_device(session, radio, credential)

    assert any(getattr(item, "rule_name", "") == "missing_wireless_metrics" for item in session.added)
    assert radio.latest_wireless_metrics["diagnosis"]["partial"] is True
