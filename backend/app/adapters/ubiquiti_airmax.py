"""Ubiquiti airMAX / UISP outdoor radio adapter.

MVP support is conservative: Generic SNMP composition plus explicit fixture/OID
keys for RF fields. UISP API is represented as a capability placeholder; no web
scraping or configuration changes are performed.
"""

from typing import Any

from app.adapters.base import AdapterCapabilities, DeviceAdapter, DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot
from app.adapters.generic_snmp import GenericSnmpRadioAdapter


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        text = (
            str(value)
            .strip()
            .replace("dBm", "")
            .replace("dB", "")
            .replace("%", "")
            .replace("Mbps", "")
            .replace("MHz", "")
            .replace("km", "")
        )
        return float(text)
    except (TypeError, ValueError):
        return None


def detect_ubiquiti_family(description: str | None) -> str | None:
    if not description:
        return None
    text = description.lower()
    for family in ["nanostation", "nanobeam", "powerbeam", "litebeam", "rocket", "airfiber", "ltu"]:
        if family in text:
            return family
    if "ubiquiti" in text or "airmax" in text or "uisp" in text:
        return "ubiquiti_outdoor"
    return None


class UbiquitiAirMaxAdapter(DeviceAdapter):
    adapter_type = "ubiquiti_airmax"

    def __init__(self, ip_address: str, community: str | None = None, timeout: int = 3, poller=None, uisp_config: dict | None = None):
        self.ip_address = ip_address
        self.community = community
        self.uisp_config = uisp_config or {}
        self.snmp = GenericSnmpRadioAdapter(ip_address, community, timeout=timeout, poller=poller) if poller else GenericSnmpRadioAdapter(ip_address, community, timeout=timeout)

    async def test_connection(self) -> DeviceHealth:
        health = await self.snmp.test_connection()
        return DeviceHealth(
            online=health.online,
            status=health.status,
            latency_ms=health.latency_ms,
            packet_loss_percent=health.packet_loss_percent,
            error=health.error,
            metadata={"transport": "snmp_v2c", "source": self.adapter_type, "uisp_api": "placeholder"},
        )

    async def get_device_info(self) -> DeviceInfo:
        info = await self.snmp.get_device_info()
        family = detect_ubiquiti_family(info.description)
        return DeviceInfo(
            name=info.name,
            description=info.description,
            uptime=info.uptime,
            model=family or info.model,
            firmware=info.firmware,
            raw=info.raw | {"adapter": self.adapter_type, "family": family, "uisp_api": "placeholder"},
        )

    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        return await self.snmp.get_interfaces()

    async def get_health(self) -> DeviceHealth:
        return await self.test_connection()

    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        result = await self.snmp._poll()
        data = result.data if result.ok else {}
        snapshot = WirelessMetricsSnapshot.from_partial(
            source="ubiquiti_airmax_snmp" if result.ok else "ping",
            rssi_dbm=_to_float(data.get("ubnt_rssi_dbm") or data.get("ubiquiti_rssi_dbm")),
            snr_db=_to_float(data.get("ubnt_snr_db") or data.get("ubiquiti_snr_db")),
            noise_floor_dbm=_to_float(data.get("ubnt_noise_floor_dbm") or data.get("ubiquiti_noise_floor_dbm")),
            ccq_percent=_to_float(data.get("ubnt_airmax_quality_percent") or data.get("ubnt_ccq_percent") or data.get("airmax_quality_percent")),
            tx_rate_mbps=_to_float(data.get("ubnt_tx_rate_mbps") or data.get("ubiquiti_tx_rate_mbps")),
            rx_rate_mbps=_to_float(data.get("ubnt_rx_rate_mbps") or data.get("ubiquiti_rx_rate_mbps")),
            frequency_mhz=_to_float(data.get("ubnt_frequency_mhz") or data.get("ubiquiti_frequency_mhz")),
            channel_width_mhz=_to_float(data.get("ubnt_channel_width_mhz") or data.get("ubiquiti_channel_width_mhz")),
            latency_ms=_to_float(data.get("ubnt_latency_ms")),
            packet_loss_percent=_to_float(data.get("ubnt_packet_loss_percent")),
            airmax_capacity_percent=_to_float(data.get("ubnt_airmax_capacity_percent") or data.get("airmax_capacity_percent")),
            link_distance_km=_to_float(data.get("ubnt_link_distance_km") or data.get("link_distance_km")),
        )
        return snapshot

    def get_capabilities(self) -> AdapterCapabilities:
        configured = bool(self.community)
        return AdapterCapabilities(
            adapter_type=self.adapter_type,
            configured=configured,
            support_status="partial",
            fixture_verified=True,
            supports_ping=True,
            supports_snmp=configured,
            supports_device_info=configured,
            supports_interfaces=configured,
            supports_health=configured,
            supports_wireless_metrics=False,
            supports_interface_counters=configured,
            supports_uisp_api=False,
            supports_configuration=False,
            reason=None if configured else "SNMP v2c credential is required for Ubiquiti airMAX polling; UISP API is placeholder only",
            missing_requirements=[] if configured else ["snmp_v2c_credential"],
        )
