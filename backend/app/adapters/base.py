"""Vendor-independent network device adapter contracts."""

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class AdapterCapabilities:
    adapter_type: str
    configured: bool
    support_status: str = "unknown"
    fixture_verified: bool = False
    supports_device_info: bool = False
    supports_interfaces: bool = False
    supports_health: bool = False
    supports_wireless_metrics: bool = False
    supports_interface_counters: bool = False
    supports_logs: bool = False
    supports_configuration: bool = False
    supports_ping: bool = False
    supports_snmp: bool = False
    supports_uisp_api: bool = False
    reason: str | None = None
    missing_requirements: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DeviceInfo:
    name: str | None = None
    description: str | None = None
    uptime: str | None = None
    model: str | None = None
    firmware: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class InterfaceSnapshot:
    name: str
    oper_status: str | None = None
    in_octets: int | None = None
    out_octets: int | None = None
    in_errors: int | None = None
    out_errors: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DeviceHealth:
    online: bool | None
    status: str
    latency_ms: float | None = None
    packet_loss_percent: float | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class WirelessMetricsSnapshot:
    rssi_dbm: float | None = None
    snr_db: float | None = None
    noise_floor_dbm: float | None = None
    ccq_percent: float | None = None
    tx_rate_mbps: float | None = None
    rx_rate_mbps: float | None = None
    frequency_mhz: float | None = None
    channel_width_mhz: float | None = None
    latency_ms: float | None = None
    packet_loss_percent: float | None = None
    airmax_capacity_percent: float | None = None
    link_distance_km: float | None = None
    collected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    source: str = "unknown"
    confidence: float = 0.0
    missing_fields: list[str] = field(default_factory=list)

    RF_FIELDS = ("rssi_dbm", "snr_db", "noise_floor_dbm", "ccq_percent")

    @classmethod
    def from_partial(cls, source: str, **values) -> "WirelessMetricsSnapshot":
        missing = [
            field_name
            for field_name in (
                "rssi_dbm",
                "snr_db",
                "noise_floor_dbm",
                "ccq_percent",
                "tx_rate_mbps",
                "rx_rate_mbps",
                "frequency_mhz",
                "channel_width_mhz",
                "latency_ms",
                "packet_loss_percent",
                "airmax_capacity_percent",
                "link_distance_km",
            )
            if values.get(field_name) is None
        ]
        total = 12
        present = total - len(missing)
        confidence = round(present / total, 2)
        return cls(source=source, confidence=confidence, missing_fields=missing, **values)

    @property
    def has_enough_rf(self) -> bool:
        return sum(getattr(self, field_name) is not None for field_name in self.RF_FIELDS) >= 2

    def as_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["collected_at"] = self.collected_at.isoformat()
        return data


class DeviceAdapter(ABC):
    adapter_type = "unknown"

    @abstractmethod
    async def test_connection(self) -> DeviceHealth:
        raise NotImplementedError

    @abstractmethod
    async def get_device_info(self) -> DeviceInfo:
        raise NotImplementedError

    @abstractmethod
    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        raise NotImplementedError

    @abstractmethod
    async def get_health(self) -> DeviceHealth:
        raise NotImplementedError

    @abstractmethod
    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        raise NotImplementedError

    @abstractmethod
    def get_capabilities(self) -> AdapterCapabilities:
        raise NotImplementedError
