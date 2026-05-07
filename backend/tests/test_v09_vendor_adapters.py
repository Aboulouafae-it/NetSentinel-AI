from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.adapters.base import DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot
from app.adapters.generic_snmp import GenericSnmpRadioAdapter
from app.adapters.placeholders import CambiumAdapter
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.credential import CredentialProfile, CredentialType
from app.models.radio_device import AdapterType, DeviceVendor, RadioDevice
from app.services.polling import poll_radio_device
from app.services.vendor_adapters import diagnose_wireless_snapshot, select_adapter


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
async def test_generic_snmp_adapter_normalizes_mocked_output():
    async def poller(_ip, _community, timeout=3):
        return SimpleNamespace(
            ok=True,
            error=None,
            data={
                "sysName": "radio-a",
                "sysDescr": "Generic SNMP Radio",
                "sysUpTime": "12345",
                "interface_names": ["eth0", "wlan0"],
                "interface_status": ["1", "2"],
                "interface_in_octets": ["100", "200"],
                "interface_out_octets": ["300", "400"],
                "interface_in_errors": ["0", "3"],
                "interface_out_errors": ["0", "1"],
            },
        )

    adapter = GenericSnmpRadioAdapter("192.0.2.10", "public", poller=poller)

    assert (await adapter.test_connection()).online is True
    assert (await adapter.get_device_info()).name == "radio-a"
    interfaces = await adapter.get_interfaces()
    assert interfaces[1].name == "wlan0"
    assert interfaces[1].in_errors == 3
    assert adapter.get_capabilities().supports_wireless_metrics is False


def test_wireless_metrics_snapshot_reports_missing_fields_and_partial_diagnosis():
    snapshot = WirelessMetricsSnapshot.from_partial(source="generic_snmp", latency_ms=4.2)
    diagnosis = diagnose_wireless_snapshot(snapshot)

    assert snapshot.confidence == 0.08
    assert "rssi_dbm" in snapshot.missing_fields
    assert diagnosis["partial"] is True
    assert diagnosis["status"] == "Partial"


def test_wireless_metrics_snapshot_can_feed_health_engine():
    snapshot = WirelessMetricsSnapshot.from_partial(
        source="vendor_adapter",
        rssi_dbm=-55,
        snr_db=32,
        noise_floor_dbm=-96,
        ccq_percent=98,
        latency_ms=2,
        packet_loss_percent=0,
    )
    diagnosis = diagnose_wireless_snapshot(snapshot)

    assert diagnosis["partial"] is False
    assert diagnosis["health_score"] >= 90


def test_adapter_selection_prefers_snmp_credentials():
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="radio", ip_address="192.0.2.10", vendor=DeviceVendor.OTHER, adapter_type=AdapterType.MANUAL_ONLY)
    credential = CredentialProfile(organization_id=radio.organization_id, name="snmp", credential_type=CredentialType.SNMP_V2C, secret_material="public")

    adapter = select_adapter(radio, credential)

    assert isinstance(adapter, GenericSnmpRadioAdapter)


def test_vendor_placeholders_do_not_fake_support():
    for adapter in [CambiumAdapter()]:
        capabilities = adapter.get_capabilities()
        assert capabilities.configured is False
        assert capabilities.supports_wireless_metrics is False
        assert "vendor_adapter_implementation" in capabilities.missing_requirements


@pytest.mark.asyncio
async def test_radio_polling_stores_adapter_snapshots(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="radio-a", ip_address="192.0.2.2")

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=2.5, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    class FakeAdapter:
        def get_capabilities(self):
            return SimpleNamespace(as_dict=lambda: {"adapter_type": "generic_snmp", "configured": True, "supports_interfaces": True})

        async def get_health(self):
            return DeviceHealth(online=True, status="online")

        async def get_device_info(self):
            return DeviceInfo(name="radio-a", description="demo", raw={"sysName": "radio-a"})

        async def get_interfaces(self):
            return [InterfaceSnapshot(name="eth0", oper_status="1")]

        async def get_wireless_metrics(self):
            return WirelessMetricsSnapshot.from_partial(source="generic_snmp", latency_ms=2.5)

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    monkeypatch.setattr("app.services.polling.select_adapter", lambda *_args, **_kwargs: FakeAdapter())

    result = await poll_radio_device(QueueSession(), radio)

    assert result["adapter"]["adapter_type"] == "generic_snmp"
    assert radio.latest_device_info["name"] == "radio-a"
    assert radio.latest_interface_status["interfaces"][0]["name"] == "eth0"
    assert radio.latest_wireless_metrics["diagnosis"]["partial"] is True


@pytest.mark.asyncio
async def test_adapter_failure_alert_is_deduped(monkeypatch):
    radio = RadioDevice(id=uuid4(), organization_id=uuid4(), name="radio-a", ip_address="192.0.2.2")
    existing = Alert(
        id=uuid4(),
        title="SNMP unreachable",
        severity=AlertSeverity.HIGH,
        status=AlertStatus.OPEN,
        organization_id=radio.organization_id,
        dedupe_key=f"radio_adapter:snmp_unreachable:{radio.id}",
        occurrence_count=1,
    )

    async def fake_check(_ip):
        return SimpleNamespace(is_reachable=True, latency_ms=2.5, packet_loss_percent=0.0, checked_at=datetime.now(timezone.utc), error_message=None)

    class FailingAdapter:
        def get_capabilities(self):
            return SimpleNamespace(as_dict=lambda: {"adapter_type": "generic_snmp", "configured": True, "supports_interfaces": True})

        async def get_health(self):
            return DeviceHealth(online=False, status="snmp_unreachable", error="timeout")

        async def get_device_info(self):
            return DeviceInfo()

        async def get_interfaces(self):
            return []

        async def get_wireless_metrics(self):
            return WirelessMetricsSnapshot.from_partial(source="generic_snmp")

    monkeypatch.setattr("app.services.polling.check_reachability", fake_check)
    monkeypatch.setattr("app.services.polling.select_adapter", lambda *_args, **_kwargs: FailingAdapter())

    await poll_radio_device(QueueSession([existing]), radio)

    assert existing.occurrence_count == 2
    assert radio.last_poll_error == "timeout"
