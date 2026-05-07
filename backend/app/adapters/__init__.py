"""Device adapter registry."""

from app.adapters.base import (
    AdapterCapabilities,
    DeviceAdapter,
    DeviceHealth,
    DeviceInfo,
    InterfaceSnapshot,
    WirelessMetricsSnapshot,
)
from app.adapters.generic_snmp import GenericSnmpRadioAdapter
from app.adapters.mikrotik_routeros import MikroTikRouterOSAdapter, RouterOSClient
from app.adapters.placeholders import CambiumAdapter
from app.adapters.tplink_cpe import TPLinkCpeAdapter
from app.adapters.ubiquiti_airmax import UbiquitiAirMaxAdapter

__all__ = [
    "AdapterCapabilities",
    "DeviceAdapter",
    "DeviceHealth",
    "DeviceInfo",
    "GenericSnmpRadioAdapter",
    "InterfaceSnapshot",
    "WirelessMetricsSnapshot",
    "MikroTikRouterOSAdapter",
    "RouterOSClient",
    "UbiquitiAirMaxAdapter",
    "TPLinkCpeAdapter",
    "CambiumAdapter",
]
