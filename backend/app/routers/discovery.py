"""
NetSentinel AI — Discovery Router

REST API for REAL network discovery operations.
All endpoints trigger or return results from actual ICMP ping probes.
No mock data flows through these endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.discovery import DiscoveredHost, DiscoveryScan, ScanStatus
from app.schemas.discovery import (
    SubnetScanRequest,
    DiscoveredHostResponse,
    DiscoveryScanResponse,
    ScanResultSummary,
)
from app.services.discovery_service import scan_subnet

router = APIRouter(prefix="/discovery", tags=["Discovery"])


@router.post("/scan", response_model=DiscoveryScanResponse)
async def trigger_subnet_scan(
    request: SubnetScanRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a REAL subnet scan.
    
    This endpoint performs actual ICMP ping probes against every host
    in the provided subnet. Results are stored in PostgreSQL.
    
    - Accepts CIDR notation (e.g., '192.168.1.0/24')
    - Maximum subnet size: /20 (4096 hosts)
    - Each host is pinged with 1 ICMP echo request, 2s timeout
    - Concurrent pings are limited to 50 at a time
    
    WARNING: This is a real network operation. It will send actual
    ICMP packets to the target subnet. Only scan networks you own
    or have explicit permission to scan.
    """
    # Validate subnet
    try:
        request.validate_subnet()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    # Execute real scan
    scan = await scan_subnet(request.subnet, db)

    return scan


@router.get("/scans", response_model=list[DiscoveryScanResponse])
async def list_scans(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """List all previous discovery scans, most recent first."""
    result = await db.execute(
        select(DiscoveryScan)
        .order_by(DiscoveryScan.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/scans/{scan_id}", response_model=ScanResultSummary)
async def get_scan_results(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific scan and all its discovered hosts."""
    scan_result = await db.execute(
        select(DiscoveryScan).where(DiscoveryScan.id == scan_id)
    )
    scan = scan_result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    hosts_result = await db.execute(
        select(DiscoveredHost)
        .where(DiscoveredHost.scan_id == scan_id)
        .order_by(DiscoveredHost.is_reachable.desc(), DiscoveredHost.ip_address)
    )
    hosts = hosts_result.scalars().all()

    return ScanResultSummary(scan=scan, hosts=hosts)


@router.get("/hosts", response_model=list[DiscoveredHostResponse])
async def list_discovered_hosts(
    reachable_only: bool = False,
    limit: int = 500,
    db: AsyncSession = Depends(get_db),
):
    """
    List all discovered hosts across all scans.
    Set reachable_only=true to see only hosts that responded to ping.
    """
    query = (
        select(DiscoveredHost)
        .order_by(DiscoveredHost.created_at.desc())
        .limit(limit)
    )
    if reachable_only:
        query = query.where(DiscoveredHost.is_reachable == True)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/hosts/latest", response_model=list[DiscoveredHostResponse])
async def list_latest_scan_hosts(
    db: AsyncSession = Depends(get_db),
):
    """
    Get hosts from the most recent completed scan only.
    This gives you the freshest view of the network.
    """
    # Find the latest completed scan
    scan_result = await db.execute(
        select(DiscoveryScan)
        .where(DiscoveryScan.status == ScanStatus.COMPLETED)
        .order_by(DiscoveryScan.created_at.desc())
        .limit(1)
    )
    latest_scan = scan_result.scalar_one_or_none()
    if not latest_scan:
        return []

    hosts_result = await db.execute(
        select(DiscoveredHost)
        .where(DiscoveredHost.scan_id == latest_scan.id)
        .order_by(DiscoveredHost.is_reachable.desc(), DiscoveredHost.ip_address)
    )
    return hosts_result.scalars().all()


@router.post("/import-as-assets")
async def import_discovered_hosts_as_assets(
    db: AsyncSession = Depends(get_db),
):
    """
    Import all reachable hosts from the latest scan as real assets.
    Skips hosts that already exist (by IP address).
    This creates REAL asset records from REAL discovery data.
    """
    from app.models.asset import Asset, AssetType, AssetStatus

    # Get latest completed scan
    scan_result = await db.execute(
        select(DiscoveryScan)
        .where(DiscoveryScan.status == ScanStatus.COMPLETED)
        .order_by(DiscoveryScan.created_at.desc())
        .limit(1)
    )
    latest_scan = scan_result.scalar_one_or_none()
    if not latest_scan:
        raise HTTPException(status_code=404, detail="No completed scans found")

    # Get reachable hosts
    hosts_result = await db.execute(
        select(DiscoveredHost)
        .where(DiscoveredHost.scan_id == latest_scan.id)
        .where(DiscoveredHost.is_reachable == True)
    )
    reachable_hosts = hosts_result.scalars().all()

    # Get existing asset IPs to avoid duplicates
    existing_result = await db.execute(select(Asset.ip_address))
    existing_ips = {row[0] for row in existing_result.fetchall() if row[0]}

    imported = 0
    skipped = 0
    for host in reachable_hosts:
        if host.ip_address in existing_ips:
            skipped += 1
            continue

        asset = Asset(
            hostname=host.hostname_resolved or f"host-{host.ip_address.replace('.', '-')}",
            ip_address=host.ip_address,
            asset_type=AssetType.OTHER,
            status=AssetStatus.ACTIVE,
        )
        db.add(asset)
        imported += 1

    if imported > 0:
        await db.flush()

    return {
        "imported": imported,
        "skipped": skipped,
        "total_reachable": len(reachable_hosts),
        "scan_subnet": latest_scan.subnet,
    }
