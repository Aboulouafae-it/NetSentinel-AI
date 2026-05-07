"""Generic SNMP radio adapter.

This adapter intentionally collects only standard, read-only SNMP values. It
does not infer vendor RF metrics from proprietary OIDs.
"""

from app.adapters.base import AdapterCapabilities, DeviceAdapter, DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot
from app.services.snmp import SnmpPollResult, poll_snmp_v2c


def _to_int(value) -> int | None:
    try:
        if value is None:
            return None
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


class GenericSnmpRadioAdapter(DeviceAdapter):
    adapter_type = "generic_snmp"

    def __init__(self, ip_address: str, community: str | None, timeout: int = 3, poller=poll_snmp_v2c):
        self.ip_address = ip_address
        self.community = community
        self.timeout = timeout
        self.poller = poller
        self._result: SnmpPollResult | None = None

    async def _poll(self) -> SnmpPollResult:
        if self._result is None:
            self._result = await self.poller(self.ip_address, self.community or "", timeout=self.timeout)
        return self._result

    async def test_connection(self) -> DeviceHealth:
        result = await self._poll()
        return DeviceHealth(online=result.ok, status="online" if result.ok else "snmp_unreachable", error=result.error)

    async def get_device_info(self) -> DeviceInfo:
        result = await self._poll()
        data = result.data if result.ok else {}
        return DeviceInfo(
            name=data.get("sysName"),
            description=data.get("sysDescr"),
            uptime=data.get("sysUpTime"),
            raw={key: data.get(key) for key in ("sysName", "sysDescr", "sysUpTime") if data.get(key) is not None},
        )

    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        result = await self._poll()
        if not result.ok:
            return []
        names = result.data.get("interface_names") or []
        statuses = result.data.get("interface_status") or []
        in_octets = result.data.get("interface_in_octets") or []
        out_octets = result.data.get("interface_out_octets") or []
        in_errors = result.data.get("interface_in_errors") or []
        out_errors = result.data.get("interface_out_errors") or []
        snapshots: list[InterfaceSnapshot] = []
        for index, name in enumerate(names):
            snapshots.append(
                InterfaceSnapshot(
                    name=name,
                    oper_status=str(statuses[index]) if index < len(statuses) else None,
                    in_octets=_to_int(in_octets[index]) if index < len(in_octets) else None,
                    out_octets=_to_int(out_octets[index]) if index < len(out_octets) else None,
                    in_errors=_to_int(in_errors[index]) if index < len(in_errors) else None,
                    out_errors=_to_int(out_errors[index]) if index < len(out_errors) else None,
                )
            )
        return snapshots

    async def get_health(self) -> DeviceHealth:
        return await self.test_connection()

    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        return WirelessMetricsSnapshot.from_partial(source=self.adapter_type)

    def get_capabilities(self) -> AdapterCapabilities:
        return AdapterCapabilities(
            adapter_type=self.adapter_type,
            configured=bool(self.community),
            support_status="partial",
            fixture_verified=True,
            supports_device_info=bool(self.community),
            supports_interfaces=bool(self.community),
            supports_health=bool(self.community),
            supports_wireless_metrics=False,
            supports_interface_counters=bool(self.community),
            reason=None if self.community else "SNMP v2c community credential is required",
            missing_requirements=[] if self.community else ["snmp_v2c_credential"],
        )
