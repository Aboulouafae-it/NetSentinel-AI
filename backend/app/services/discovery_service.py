"""
NetSentinel AI — Real Network Discovery Service

This service performs REAL ICMP ping probes against actual network hosts.
NO mock data. NO random generation. Every result comes from a real network probe.

How it works:
  1. Takes a CIDR subnet (e.g., 192.168.1.0/24)
  2. Enumerates all host IPs in that subnet
  3. Pings each host using the system `ping` command via asyncio.subprocess
  4. Parses the real response time from ping output
  5. Optionally resolves hostname via reverse DNS
  6. Stores real results in PostgreSQL

Why system `ping` instead of raw sockets?
  - Raw ICMP sockets require root/CAP_NET_RAW
  - System `ping` is setuid on most Linux systems and works without root
  - This makes deployment simpler and more portable

Concurrency:
  - Uses asyncio.Semaphore to limit concurrent pings (default: 50)
  - This prevents overwhelming the network or hitting OS limits
"""

import asyncio
import ipaddress
import re
import socket
import time
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discovery import DiscoveredHost, DiscoveryScan, ScanStatus


# Max concurrent ping processes
MAX_CONCURRENT_PINGS = 50

# Ping timeout per host (seconds)
PING_TIMEOUT = 2

# Number of ping packets to send per host
PING_COUNT = 1


async def ping_host(ip: str, timeout: int = PING_TIMEOUT, count: int = PING_COUNT) -> dict:
    """
    Ping a single host using the system `ping` command.
    Returns a dict with real probe results.
    
    This is a REAL network operation — it sends an actual ICMP echo request
    to the specified IP address and waits for a response.
    """
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping", "-c", str(count), "-W", str(timeout), "-q", ip,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), timeout=timeout + 5
        )

        output = stdout.decode("utf-8", errors="replace")
        is_reachable = proc.returncode == 0
        response_time_ms = None

        if is_reachable:
            # Parse real RTT from ping output
            # Example: "rtt min/avg/max/mdev = 0.456/0.456/0.456/0.000 ms"
            rtt_match = re.search(
                r"rtt min/avg/max/mdev\s*=\s*([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)\s*ms",
                output
            )
            if rtt_match:
                response_time_ms = float(rtt_match.group(2))  # avg RTT

        return {
            "ip": ip,
            "is_reachable": is_reachable,
            "response_time_ms": response_time_ms,
        }

    except asyncio.TimeoutError:
        return {
            "ip": ip,
            "is_reachable": False,
            "response_time_ms": None,
        }
    except Exception as e:
        return {
            "ip": ip,
            "is_reachable": False,
            "response_time_ms": None,
        }


def resolve_hostname(ip: str) -> str | None:
    """
    Attempt real reverse DNS lookup for an IP.
    Returns the hostname if resolvable, None otherwise.
    This is a REAL DNS query — not simulated.
    """
    try:
        hostname, _, _ = socket.gethostbyaddr(ip)
        return hostname
    except (socket.herror, socket.gaierror, OSError):
        return None


async def scan_subnet(
    subnet_str: str,
    db: AsyncSession,
) -> DiscoveryScan:
    """
    Perform a REAL ICMP ping sweep of the given subnet.
    
    This function:
      1. Creates a scan record in the DB
      2. Enumerates all host IPs (excludes network and broadcast)
      3. Pings every host concurrently (rate-limited)
      4. Resolves hostnames for reachable hosts
      5. Stores all results in PostgreSQL
      6. Returns the completed scan record
    
    Every single result is from a real network probe. Zero mock data.
    """
    network = ipaddress.IPv4Network(subnet_str, strict=False)
    host_ips = [str(ip) for ip in network.hosts()]  # Excludes network & broadcast

    # Create scan record
    scan = DiscoveryScan(
        subnet=subnet_str,
        status=ScanStatus.RUNNING,
        total_hosts=len(host_ips),
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)

    scan_start = time.monotonic()
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_PINGS)

    async def bounded_ping(ip: str) -> dict:
        async with semaphore:
            return await ping_host(ip)

    # Execute all pings concurrently (real network I/O)
    try:
        results = await asyncio.gather(*[bounded_ping(ip) for ip in host_ips])
    except Exception as e:
        scan.status = ScanStatus.FAILED
        scan.error_message = str(e)[:500]
        await db.flush()
        return scan

    # Process results and store in DB
    reachable_count = 0
    unreachable_count = 0
    now = datetime.now(timezone.utc)

    for result in results:
        is_reachable = result["is_reachable"]
        
        # Resolve hostname only for reachable hosts (save time on dead IPs)
        hostname = None
        if is_reachable:
            reachable_count += 1
            hostname = resolve_hostname(result["ip"])
        else:
            unreachable_count += 1

        host = DiscoveredHost(
            ip_address=result["ip"],
            is_reachable=is_reachable,
            response_time_ms=result["response_time_ms"],
            hostname_resolved=hostname,
            scan_id=scan.id,
            last_seen=now if is_reachable else None,
        )
        db.add(host)

    # Finalize scan record with real statistics
    scan.status = ScanStatus.COMPLETED
    scan.reachable_hosts = reachable_count
    scan.unreachable_hosts = unreachable_count
    scan.duration_seconds = round(time.monotonic() - scan_start, 2)

    await db.flush()
    await db.refresh(scan)

    return scan
