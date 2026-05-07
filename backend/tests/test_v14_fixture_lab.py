import json
from pathlib import Path

import pytest

from app.adapters.generic_snmp import GenericSnmpRadioAdapter
from app.adapters.mikrotik_routeros import MikroTikRouterOSAdapter
from app.adapters.support_matrix import get_support_matrix
from app.adapters.tplink_cpe import TPLinkCpeAdapter
from app.adapters.ubiquiti_airmax import UbiquitiAirMaxAdapter, detect_ubiquiti_family
from app.routers.syslog import classify_syslog_message, should_alert
from app.models.log import LogLevel
from app.services.snmp import SnmpPollResult, _parse_value, _parse_walk


FIXTURES = Path(__file__).parent / "fixtures" / "devices"


def load_fixture(*parts: str) -> dict:
    return json.loads((FIXTURES.joinpath(*parts)).read_text())


def test_fixture_directories_and_readmes_exist():
    for directory in ["mikrotik", "tplink_cpe", "ubiquiti_airmax", "generic_snmp", "syslog"]:
        path = FIXTURES / directory
        assert path.is_dir()
        assert (path / "README.md").read_text().strip()


class FixtureRouterOSClient:
    def __init__(self, fixture: dict, **_kwargs):
        self.fixture = fixture

    async def run(self, command: str, **_params):
        return self.fixture["commands"].get(command, [])


@pytest.mark.asyncio
async def test_mikrotik_adapter_parses_routeros_fixture():
    fixture = load_fixture("mikrotik", "routeros_sample.json")
    adapter = MikroTikRouterOSAdapter(
        host="192.0.2.10",
        username="readonly",
        password="redacted",
        client_factory=lambda **kwargs: FixtureRouterOSClient(fixture, **kwargs),
    )

    assert (await adapter.test_connection()).online is True
    info = await adapter.get_device_info()
    assert info.name == "mt-edge-ptp-a"
    assert info.model == "LHG 5 ac"
    assert info.firmware == "7.14.3"

    health = await adapter.get_health()
    assert health.metadata["cpu_load_percent"] == 23
    assert health.metadata["memory_used_percent"] == 50
    assert health.metadata["interface_count"] == 3

    interfaces = await adapter.get_interfaces()
    assert interfaces[0].name == "ether1"
    assert interfaces[0].oper_status == "up"
    assert interfaces[2].oper_status == "down"

    metrics = await adapter.get_wireless_metrics()
    assert metrics.rssi_dbm == -61
    assert metrics.snr_db == 32
    assert metrics.ccq_percent == 91
    assert metrics.has_enough_rf is True


async def fixture_poller(data: dict):
    async def _poller(_ip: str, _community: str, timeout: int = 3):
        return SnmpPollResult(True, data)

    return _poller


@pytest.mark.asyncio
async def test_generic_snmp_fixture_parses_standard_system_and_interface_data():
    fixture = load_fixture("generic_snmp", "generic_snmp_sample.json")
    adapter = GenericSnmpRadioAdapter("192.0.2.20", "public", poller=await fixture_poller(fixture["data"]))

    info = await adapter.get_device_info()
    assert info.name == "edge-radio-01"
    assert info.description == "Generic Outdoor Radio SNMP Agent"
    assert info.uptime == "123456789"

    interfaces = await adapter.get_interfaces()
    assert [item.name for item in interfaces] == ["eth0", "wlan0", "bridge0"]
    assert interfaces[1].in_octets == 2000
    assert interfaces[1].in_errors == 4
    assert interfaces[2].oper_status == "down"

    metrics = await adapter.get_wireless_metrics()
    assert metrics.source == "generic_snmp"
    assert "rssi_dbm" in metrics.missing_fields


@pytest.mark.asyncio
async def test_generic_snmp_handles_empty_and_error_results():
    empty = load_fixture("generic_snmp", "malformed_empty_sample.json")
    adapter = GenericSnmpRadioAdapter("192.0.2.21", "public", poller=await fixture_poller(empty["data"]))
    assert await adapter.get_interfaces() == []
    assert (await adapter.get_device_info()).name is None

    async def timeout_poller(_ip: str, _community: str, timeout: int = 3):
        return SnmpPollResult(False, {}, "SNMP polling timed out")

    failed = GenericSnmpRadioAdapter("192.0.2.22", "public", poller=timeout_poller)
    health = await failed.test_connection()
    assert health.online is False
    assert health.status == "snmp_unreachable"
    assert health.error == "SNMP polling timed out"


def test_snmp_low_level_parser_ignores_malformed_lines():
    malformed = load_fixture("generic_snmp", "malformed_empty_sample.json")
    assert _parse_value(malformed["malformed_outputs"][0]) == "not an oid response"
    assert _parse_walk("\n".join(malformed["malformed_outputs"])) == ["not an oid response"]


@pytest.mark.asyncio
async def test_tplink_basic_fixture_does_not_fake_wireless_metrics():
    fixture = load_fixture("tplink_cpe", "cpe710_snmp_basic.json")
    adapter = TPLinkCpeAdapter("192.0.2.30", "public", poller=await fixture_poller(fixture["data"]))

    info = await adapter.get_device_info()
    assert info.model == "TP-Link CPE"
    metrics = await adapter.get_wireless_metrics()
    assert metrics.source == "tplink_cpe_snmp"
    assert metrics.rssi_dbm is None
    assert metrics.snr_db is None
    assert "rssi_dbm" in metrics.missing_fields
    assert "snr_db" in metrics.missing_fields


@pytest.mark.asyncio
async def test_tplink_wireless_fixture_uses_only_explicit_rf_fields():
    fixture = load_fixture("tplink_cpe", "cpe710_wireless_fixture.json")
    adapter = TPLinkCpeAdapter("192.0.2.31", "public", poller=await fixture_poller(fixture["data"]))

    metrics = await adapter.get_wireless_metrics()
    assert metrics.rssi_dbm == -64
    assert metrics.snr_db == 29
    assert metrics.noise_floor_dbm == -93
    assert metrics.ccq_percent == 86
    assert metrics.has_enough_rf is True


@pytest.mark.asyncio
async def test_ubiquiti_fixture_behavior_and_family_detection():
    basic = load_fixture("ubiquiti_airmax", "powerbeam_snmp_basic.json")
    adapter = UbiquitiAirMaxAdapter("192.0.2.40", "public", poller=await fixture_poller(basic["data"]))
    info = await adapter.get_device_info()
    assert info.model == "powerbeam"
    assert detect_ubiquiti_family("UniFi AP AC") is None
    metrics = await adapter.get_wireless_metrics()
    assert metrics.rssi_dbm is None
    assert "rssi_dbm" in metrics.missing_fields

    wireless = load_fixture("ubiquiti_airmax", "powerbeam_airmax_wireless_fixture.json")
    rf_adapter = UbiquitiAirMaxAdapter("192.0.2.41", "public", poller=await fixture_poller(wireless["data"]))
    rf_metrics = await rf_adapter.get_wireless_metrics()
    assert rf_metrics.rssi_dbm == -58
    assert rf_metrics.airmax_capacity_percent == 88
    assert rf_metrics.link_distance_km == 3.6
    assert rf_metrics.has_enough_rf is True


def test_syslog_fixture_classification_samples():
    fixture = load_fixture("syslog", "syslog_samples.json")
    for sample in fixture["samples"]:
        categories = classify_syslog_message(sample["message"])
        for expected in sample["expected_categories"]:
            assert expected in categories
        assert should_alert(sample["message"], LogLevel.WARNING)


def test_support_matrix_is_honest_and_fixture_aware():
    rows = {row["adapter_type"]: row for row in get_support_matrix()}
    assert rows["generic_snmp"]["configuration_changes"] is False
    assert rows["mikrotik_routeros"]["fixture_verified"] is True
    assert rows["tplink_cpe"]["wireless_rf_metrics"] == "requires_fixture_or_known_oids"
    assert rows["ubiquiti_airmax"]["status"] == "partial"
    assert rows["cambium"]["status"] == "placeholder"
