"""Bounded ICMP reachability checks for assets and radio devices."""

from dataclasses import dataclass
from datetime import datetime, timezone

from app.services.discovery_service import ping_host


@dataclass(frozen=True)
class ReachabilityResult:
    is_reachable: bool
    latency_ms: float | None
    packet_loss_percent: float | None
    checked_at: datetime
    error_message: str | None = None


async def check_reachability(ip_address: str, timeout: int = 2, count: int = 1, runner=ping_host) -> ReachabilityResult:
    if not ip_address:
        return ReachabilityResult(False, None, None, datetime.now(timezone.utc), "Missing IP address")
    result = await runner(ip_address, timeout=timeout, count=count)
    is_reachable = bool(result.get("is_reachable"))
    return ReachabilityResult(
        is_reachable=is_reachable,
        latency_ms=result.get("response_time_ms"),
        packet_loss_percent=0.0 if is_reachable else 100.0,
        checked_at=datetime.now(timezone.utc),
        error_message=None if is_reachable else result.get("error") or "Host unreachable",
    )
