"""MikroTik RouterOS read-only adapter.

The transport is intentionally wrapped behind RouterOSClient so tests can mock
device responses without reaching a real router. The default transport is a
stub until a RouterOS API dependency is selected and vetted.
"""

from collections.abc import Callable
import re
from typing import Any

from app.adapters.base import AdapterCapabilities, DeviceAdapter, DeviceHealth, DeviceInfo, InterfaceSnapshot, WirelessMetricsSnapshot


def _first(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return rows[0] if rows else {}


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        text = str(value).strip().replace("%", "").replace("Mbps", "").replace("M", "")
        match = re.search(r"-?\d+(?:\.\d+)?", text)
        if match:
            text = match.group(0)
        return float(text)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    number = _to_float(value)
    return int(number) if number is not None else None


def _bytes(value: Any) -> int | None:
    return _to_int(value)


class RouterOSClient:
    """Small read-only RouterOS command wrapper.

    TODO: replace the stub transport with a vetted RouterOS API library. The
    adapter already depends only on this read-only `run` method.
    """

    def __init__(self, host: str, username: str | None, password: str | None, port: int = 8728, use_tls: bool = False, timeout: int = 5):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.use_tls = use_tls
        self.timeout = timeout

    async def run(self, command: str, **_params) -> list[dict[str, Any]]:
        raise RuntimeError("RouterOS transport is not configured; install/configure a RouterOS API client")


class MikroTikRouterOSAdapter(DeviceAdapter):
    adapter_type = "mikrotik_routeros"

    def __init__(
        self,
        host: str,
        username: str | None,
        password: str | None,
        port: int = 8728,
        use_tls: bool = False,
        timeout: int = 5,
        client_factory: Callable[..., RouterOSClient] = RouterOSClient,
    ):
        self.host = host
        self.username = username
        self.password = password
        self.port = port
        self.use_tls = use_tls
        self.timeout = timeout
        self.client = client_factory(host=host, username=username, password=password, port=port, use_tls=use_tls, timeout=timeout)

    def _configured(self) -> bool:
        return bool(self.host and self.username and self.password)

    async def _safe_run(self, command: str, **params) -> tuple[list[dict[str, Any]], str | None]:
        if not self._configured():
            return [], "RouterOS username/password credential is required"
        try:
            return await self.client.run(command, **params), None
        except Exception as exc:
            return [], str(exc)

    async def test_connection(self) -> DeviceHealth:
        rows, error = await self._safe_run("/system/identity/print")
        return DeviceHealth(online=error is None, status="online" if error is None else "connection_failed", error=error)

    async def get_device_info(self) -> DeviceInfo:
        identity_rows, identity_error = await self._safe_run("/system/identity/print")
        resource_rows, resource_error = await self._safe_run("/system/resource/print")
        identity = _first(identity_rows)
        resource = _first(resource_rows)
        return DeviceInfo(
            name=identity.get("name"),
            description=resource.get("platform") or resource.get("architecture-name"),
            uptime=resource.get("uptime"),
            model=resource.get("board-name"),
            firmware=resource.get("version"),
            raw={
                "identity": identity,
                "resource": resource,
                "errors": [error for error in [identity_error, resource_error] if error],
            },
        )

    async def get_interfaces(self) -> list[InterfaceSnapshot]:
        rows, _error = await self._safe_run("/interface/print")
        interfaces: list[InterfaceSnapshot] = []
        for row in rows:
            running = str(row.get("running", "")).lower() in {"true", "yes", "1"}
            disabled = str(row.get("disabled", "")).lower() in {"true", "yes", "1"}
            oper_status = "down" if disabled else "up" if running else "down"
            interfaces.append(
                InterfaceSnapshot(
                    name=row.get("name") or row.get("default-name") or "unknown",
                    oper_status=oper_status,
                    in_octets=_bytes(row.get("rx-byte") or row.get("rx-bytes")),
                    out_octets=_bytes(row.get("tx-byte") or row.get("tx-bytes")),
                    in_errors=_to_int(row.get("rx-error") or row.get("rx-errors")),
                    out_errors=_to_int(row.get("tx-error") or row.get("tx-errors")),
                )
            )
        return interfaces

    async def get_health(self) -> DeviceHealth:
        resource_rows, error = await self._safe_run("/system/resource/print")
        if error:
            return DeviceHealth(online=False, status="connection_failed", error=error)
        resource = _first(resource_rows)
        free = _to_float(resource.get("free-memory"))
        total = _to_float(resource.get("total-memory"))
        memory_used_percent = round(((total - free) / total) * 100, 2) if free is not None and total else None
        cpu_load = _to_float(resource.get("cpu-load"))
        return DeviceHealth(
            online=True,
            status="healthy" if cpu_load is None or cpu_load < 85 else "degraded",
            error=None,
            metadata={
                "cpu_load_percent": cpu_load,
                "memory_used_percent": memory_used_percent,
                "uptime": resource.get("uptime"),
                "platform": resource.get("platform"),
                "board_name": resource.get("board-name"),
                "interface_count": len(await self.get_interfaces()),
            },
        )

    async def get_wireless_metrics(self) -> WirelessMetricsSnapshot:
        rows, error = await self._safe_run("/interface/wireless/registration-table/print")
        if error or not rows:
            rows, error = await self._safe_run("/interface/wifi/registration-table/print")
        row = _first(rows)
        return WirelessMetricsSnapshot.from_partial(
            source=self.adapter_type,
            rssi_dbm=_to_float(row.get("signal-strength") or row.get("rx-signal")),
            snr_db=_to_float(row.get("signal-to-noise") or row.get("snr")),
            noise_floor_dbm=_to_float(row.get("noise-floor")),
            ccq_percent=_to_float(row.get("tx-ccq") or row.get("ccq")),
            tx_rate_mbps=_to_float(row.get("tx-rate")),
            rx_rate_mbps=_to_float(row.get("rx-rate")),
            frequency_mhz=_to_float(row.get("frequency")),
            channel_width_mhz=_to_float(row.get("channel-width")),
        )

    async def get_logs(self, limit: int = 20) -> list[dict[str, Any]]:
        rows, _error = await self._safe_run("/log/print", limit=limit)
        return rows[:limit]

    def get_capabilities(self) -> AdapterCapabilities:
        configured = self._configured()
        return AdapterCapabilities(
            adapter_type=self.adapter_type,
            configured=configured,
            support_status="partial",
            fixture_verified=True,
            supports_device_info=configured,
            supports_interfaces=configured,
            supports_health=configured,
            supports_wireless_metrics=configured,
            supports_interface_counters=configured,
            supports_logs=configured,
            supports_configuration=False,
            reason=None if configured else "RouterOS username/password credential is required",
            missing_requirements=[] if configured else ["routeros_credential"],
        )
