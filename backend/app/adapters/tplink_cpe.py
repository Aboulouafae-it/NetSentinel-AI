"""TP-Link CPE / outdoor radio adapter.

MVP support is intentionally conservative: reachability plus Generic SNMP data.
TP-Link proprietary RF OIDs are not inferred. Real wireless fields are returned
only if a fixture/poller supplies explicit TP-Link wireless data keys.
"""

from typing import Any

from app.adapters.base import AdapterCapabilities, DeviceAdapter, DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot
from app.adapters.generic_snmp import GenericSnmpRadioAdapter


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        text = str(value).strip().replace("dBm", "").replace("dB", "").replace("%", "").replace("Mbps", "").replace("MHz", "")
        return float(text)
    except (TypeError, ValueError):
        return None


class TPLinkCpeAdapter(DeviceAdapter):
    adapter_type = "tplink_cpe"

    def __init__(self, ip_address: str, community: str | None = None, timeout: int = 3, poller=None):
        self.ip_address = ip_address
        self.community = community
        self.snmp = GenericSnmpRadioAdapter(ip_address, community, timeout=timeout, poller=poller) if poller else GenericSnmpRadioAdapter(ip_address, community, timeout=timeout)

    async def test_connection(self) -> DeviceHealth:
        health = await self.snmp.test_connection()
        return DeviceHealth(
            online=health.online,
            status=health.status,
            latency_ms=health.latency_ms,
            packet_loss_percent=health.packet_loss_percent,
            error=health.error,
            metadata={"transport": "snmp_v2c", "source": self.adapter_type},
        )

    async def get_device_info(self) -> DeviceInfo:
        info = await self.snmp.get_device_info()
        return DeviceInfo(
            name=info.name,
            description=info.description,
            uptime=info.uptime,
            model="TP-Link CPE" if info.description and "tp-link" in info.description.lower() else info.model,
            firmware=info.firmware,
            raw=info.raw | {"adapter": self.adapter_type},
        )

    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        return await self.snmp.get_interfaces()

    async def get_health(self) -> DeviceHealth:
        return await self.test_connection()

    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        result = await self.snmp._poll()
        data = result.data if result.ok else {}
        return WirelessMetricsSnapshot.from_partial(
            source="tplink_cpe_snmp" if result.ok else "ping",
            rssi_dbm=_to_float(data.get("tplink_rssi_dbm")),
            snr_db=_to_float(data.get("tplink_snr_db")),
            noise_floor_dbm=_to_float(data.get("tplink_noise_floor_dbm")),
            ccq_percent=_to_float(data.get("tplink_link_quality_percent") or data.get("tplink_ccq_percent")),
            tx_rate_mbps=_to_float(data.get("tplink_tx_rate_mbps")),
            rx_rate_mbps=_to_float(data.get("tplink_rx_rate_mbps")),
            frequency_mhz=_to_float(data.get("tplink_frequency_mhz")),
            channel_width_mhz=_to_float(data.get("tplink_channel_width_mhz")),
        )

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
            supports_configuration=False,
            reason=None if configured else "SNMP v2c credential is required for TP-Link CPE polling",
            missing_requirements=[] if configured else ["snmp_v2c_credential"],
        )
