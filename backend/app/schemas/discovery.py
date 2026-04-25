"""
NetSentinel AI — Discovery Schemas

Pydantic validation for real network discovery operations.
"""

from datetime import datetime
from pydantic import BaseModel, Field
import ipaddress


class SubnetScanRequest(BaseModel):
    """
    Request to scan a real subnet.
    Accepts CIDR notation (e.g., '192.168.1.0/24').
    Maximum allowed subnet size: /20 (4096 hosts) to prevent abuse.
    """
    subnet: str = Field(
        ...,
        description="Subnet in CIDR notation, e.g. '192.168.1.0/24'",
        examples=["192.168.1.0/24", "10.0.0.0/28"]
    )

    def validate_subnet(self) -> ipaddress.IPv4Network:
        """Validate and return the parsed network. Raises ValueError on bad input."""
        try:
            network = ipaddress.IPv4Network(self.subnet, strict=False)
        except (ipaddress.AddressValueError, ipaddress.NetmaskValueError, ValueError) as e:
            raise ValueError(f"Invalid subnet: {self.subnet}. Error: {e}")

        # Safety: reject subnets larger than /20 (4096 hosts)
        if network.prefixlen < 20:
            raise ValueError(
                f"Subnet /{network.prefixlen} is too large. "
                f"Maximum allowed is /20 (4096 hosts). Got {network.num_addresses} hosts."
            )

        return network


class DiscoveredHostResponse(BaseModel):
    id: str
    ip_address: str
    is_reachable: bool
    response_time_ms: float | None = None
    hostname_resolved: str | None = None
    scan_id: str
    last_seen: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiscoveryScanResponse(BaseModel):
    id: str
    subnet: str
    status: str
    total_hosts: int
    reachable_hosts: int
    unreachable_hosts: int
    duration_seconds: float | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScanResultSummary(BaseModel):
    """Returned after a scan completes."""
    scan: DiscoveryScanResponse
    hosts: list[DiscoveredHostResponse]
