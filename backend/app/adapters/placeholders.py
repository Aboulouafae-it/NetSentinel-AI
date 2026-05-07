"""Vendor adapter placeholders.

These classes deliberately do not return fake metrics. They document the
extension points for v1.x vendor-specific work.
"""

from app.adapters.base import AdapterCapabilities, DeviceAdapter, DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot


class PlaceholderAdapter(DeviceAdapter):
    adapter_type = "placeholder"
    vendor_name = "Vendor"

    async def test_connection(self) -> DeviceHealth:
        return DeviceHealth(online=None, status="not_configured", error=f"{self.vendor_name} adapter is not implemented")

    async def get_device_info(self) -> DeviceInfo:
        return DeviceInfo(raw={"status": "not_configured", "todo": f"Implement {self.vendor_name} device info collection"})

    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        return []

    async def get_health(self) -> DeviceHealth:
        return await self.test_connection()

    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        return WirelessMetricsSnapshot.from_partial(source=self.adapter_type)

    def get_capabilities(self) -> AdapterCapabilities:
        return AdapterCapabilities(
            adapter_type=self.adapter_type,
            configured=False,
            support_status="placeholder",
            fixture_verified=False,
            reason=f"{self.vendor_name} adapter placeholder only; no live support yet",
            missing_requirements=["vendor_adapter_implementation"],
        )


class CambiumAdapter(PlaceholderAdapter):
    adapter_type = "cambium"
    vendor_name = "Cambium"
