"""
NetSentinel AI — Database Seeder

Populates the database with demo data for the MVP dashboard.
"""

import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import async_session
from app.models.user import User
from app.models.organization import Organization
from app.models.site import Site
from app.models.asset import Asset, AssetType, AssetStatus
from app.models.wireless import (
    AntennaProfile, AntennaPolarization,
    PhysicalMount,
    RadioInterface, RadioMode, LinkType,
    WirelessLink, WirelessLinkStatus, WirelessMetric
)
import random
from datetime import datetime, timedelta
from app.models.alert import Alert, AlertSeverity, AlertStatus
from app.models.incident import Incident, IncidentSeverity, IncidentStatus
from app.models.automation import PlaybookRule, ActionType
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed_data(db: AsyncSession):
    """Seed initial demo data."""
    
    # 1. Organization
    result = await db.execute(select(Organization).where(Organization.name == "Acme Corp"))
    org = result.scalar_one_or_none()
    
    if not org:
        logger.info("Creating demo organization...")
        org = Organization(
            name="Acme Corp",
            description="Global manufacturing and logistics",
            industry="Manufacturing",
            contact_email="it@acmecorp.example.com",
        )
        db.add(org)
        await db.flush()

    # 2. Users
    result = await db.execute(select(User).where(User.email == "admin@netsentinel.ai"))
    admin = result.scalar_one_or_none()
    
    if not admin:
        logger.info("Creating demo admin user...")
        admin = User(
            email="admin@netsentinel.ai",
            hashed_password=hash_password("admin123!"),
            full_name="System Admin",
            is_superuser=True,
            organization_id=org.id,
        )
        db.add(admin)
        await db.flush()

    # 3. Sites
    result = await db.execute(select(Site).where(Site.name == "HQ - New York"))
    hq_site = result.scalar_one_or_none()
    
    if not hq_site:
        logger.info("Creating demo sites...")
        hq_site = Site(
            name="HQ - New York",
            location="New York, NY",
            subnet="10.0.0.0/16",
            organization_id=org.id,
        )
        branch_site = Site(
            name="Branch - London",
            location="London, UK",
            subnet="10.1.0.0/16",
            organization_id=org.id,
        )
        db.add_all([hq_site, branch_site])
        await db.flush()

    # 4. Assets
    result = await db.execute(select(Asset).where(Asset.site_id == hq_site.id))
    assets = result.scalars().all()
    
    if not assets:
        logger.info("Creating demo assets...")
        new_assets = [
            Asset(
                hostname="hq-fw-01",
                ip_address="10.0.0.1",
                mac_address="00:1A:2B:3C:4D:5E",
                asset_type=AssetType.FIREWALL,
                status=AssetStatus.ONLINE,
                vendor="Palo Alto Networks",
                site_id=hq_site.id,
            ),
            Asset(
                hostname="hq-core-sw-01",
                ip_address="10.0.0.2",
                asset_type=AssetType.SWITCH,
                status=AssetStatus.ONLINE,
                vendor="Cisco",
                site_id=hq_site.id,
            ),
            Asset(
                hostname="hq-db-primary",
                ip_address="10.0.10.15",
                asset_type=AssetType.SERVER,
                status=AssetStatus.DEGRADED,
                os_info="Ubuntu 22.04 LTS",
                site_id=hq_site.id,
            ),
            Asset(
                hostname="hq-app-server-01",
                ip_address="10.0.10.20",
                asset_type=AssetType.SERVER,
                status=AssetStatus.ONLINE,
                os_info="Ubuntu 22.04 LTS",
                site_id=hq_site.id,
            ),
            Asset(
                hostname="hq-wifi-ap-01",
                ip_address="10.0.20.5",
                asset_type=AssetType.ACCESS_POINT,
                status=AssetStatus.OFFLINE,
                vendor="Ubiquiti",
                site_id=hq_site.id,
            ),
        ]
        db.add_all(new_assets)
        await db.flush()
        
        db_server = new_assets[2]
        wifi_ap = new_assets[4]

        # 5. Wireless Link Intelligence (Deep Normalization Seed)
        logger.info("Creating core RF primitives and wireless links...")
        
        ap_profile = AntennaProfile(
            name="Ubiquiti PowerBeam 5AC Gen2",
            gain_dbi=25.0,
            beamwidth_h_deg=10.0,
            beamwidth_v_deg=10.0,
            polarization=AntennaPolarization.DUAL_SLANT
        )
        db.add(ap_profile)
        await db.flush()
        
        mount_a = PhysicalMount(site_id=hq_site.id, name="HQ Roof - Mast A", elevation_meters=30.0, azimuth_heading_deg=180.0)
        mount_b = PhysicalMount(site_id=branch_site.id, name="Branch Roof - Mast 1", elevation_meters=15.0, azimuth_heading_deg=0.0)
        db.add_all([mount_a, mount_b])
        await db.flush()
        
        if len(new_assets) >= 5:
            radio_a = RadioInterface(
                asset_id=new_assets[0].id, mount_id=mount_a.id, antenna_profile_id=ap_profile.id,
                mac_address="00:1A:2B:3C:AA:01", mode=RadioMode.ACCESS_POINT,
                frequency_mhz=5800, channel_width_mhz=40, tx_power_dbm=24
            )
            radio_b = RadioInterface(
                asset_id=new_assets[1].id, mount_id=mount_b.id, antenna_profile_id=ap_profile.id,
                mac_address="00:1A:2B:3C:AA:02", mode=RadioMode.STATION,
                frequency_mhz=5800, channel_width_mhz=40, tx_power_dbm=24
            )
            db.add_all([radio_a, radio_b])
            await db.flush()
            
            wlink = WirelessLink(
                organization_id=org.id,
                name="HQ to Branch Backhaul",
                interface_a_id=radio_a.id,
                interface_b_id=radio_b.id,
                link_type=LinkType.PTP,
                theoretical_max_capacity_mbps=450,
                expected_rssi_dbm=-65.0,
                status=WirelessLinkStatus.DEGRADED
            )
            db.add(wlink)
            await db.flush()
            
            # Seed 50 historical Time-Series Metrics
            now = datetime.utcnow()
            metrics = []
            for i in range(50):
                # Simulate a degrading link (RSSI drops, SNR drops, CCQ fluctuates)
                time_offset = now - timedelta(minutes=(50 - i) * 5)
                rssi = -65.0 - (i * 0.2) # drops from -65 to -75
                noise = -96.0 + random.uniform(-1, 1)
                metrics.append(WirelessMetric(
                    wireless_link_id=wlink.id,
                    timestamp=time_offset,
                    rssi=rssi,
                    noise_floor=noise,
                    snr=rssi - noise,
                    ccq=100.0 - (i * 0.5) + random.uniform(-2, 2), # drops from 100 to ~75
                    tx_capacity=int(450 - (i * 5)),
                    rx_capacity=int(450 - (i * 5))
                ))
            db.add_all(metrics)
            await db.flush()
        else:
            wlink = None

        # 6. Incidents
        logger.info("Creating demo incidents...")
        incident1 = Incident(
            title="Database Performance Degradation",
            description="Primary database server showing sustained high CPU and memory usage during off-peak hours.",
            severity=IncidentSeverity.HIGH,
            status=IncidentStatus.INVESTIGATING,
            assigned_to="Admin User",
            organization_id=org.id,
        )
        db.add(incident1)
        await db.flush()

        # 7. Security Rules & Playbooks
        logger.info("Creating demo security rules and automation playbooks...")
        
        # Detection Rule
        dr_ssh = DetectionRule(
            name="Multiple Failed SSH Logins",
            description="Detects multiple failed SSH login attempts from an unknown IP.",
            severity="high",
            target_field="message",
            condition="contains",
            pattern="Failed password for",
            organization_id=org.id
        )
        # IOC
        ioc_bad_ip = IndicatorOfCompromise(
            ioc_type="ip",
            value="198.51.100.42",
            description="Known malicious IP from Threat Feed.",
            confidence=95,
            organization_id=org.id
        )
        db.add_all([dr_ssh, ioc_bad_ip])
        await db.flush()
        
        # Automation Playbooks
        playbook_isolate = PlaybookRule(
            name="Isolate on Critical Threat",
            description="Automatically isolates an asset if a CRITICAL alert is generated.",
            trigger_on_severity="critical",
            action_type=ActionType.ISOLATE_ASSET,
            action_config="{}",
            organization_id=org.id
        )
        playbook_escalate = PlaybookRule(
            name="Escalate High Severity Alerts",
            description="Automatically creates an Incident for any HIGH severity alert.",
            trigger_on_severity="high",
            action_type=ActionType.CREATE_INCIDENT,
            action_config="{}",
            organization_id=org.id
        )
        db.add_all([playbook_isolate, playbook_escalate])
        await db.flush()

        # 8. Alerts
        logger.info("Creating demo alerts...")
        alerts = [
            Alert(
                title="High CPU Utilization",
                description="CPU usage has exceeded 90% for over 15 minutes.",
                severity=AlertSeverity.HIGH,
                status=AlertStatus.OPEN,
                source="Prometheus",
                organization_id=org.id,
                asset_id=db_server.id,
                incident_id=incident1.id,
            ),
            Alert(
                title="Unusual Outbound Traffic",
                description="Detected anomaly in outbound traffic volume from database server.",
                severity=AlertSeverity.CRITICAL,
                status=AlertStatus.OPEN,
                source="Zeek IDPS",
                rule_name="Anomaly Detection",
                organization_id=org.id,
                asset_id=db_server.id,
                incident_id=incident1.id,
            ),
            Alert(
                title="Device Offline",
                description="Access point failed to respond to ping for 5 consecutive checks.",
                severity=AlertSeverity.MEDIUM,
                status=AlertStatus.OPEN,
                source="Ping Monitor",
                organization_id=org.id,
                asset_id=wifi_ap.id,
            ),
            Alert(
                title="Failed SSH Login Attempts",
                description="Multiple failed SSH login attempts detected from unknown IP.",
                severity=AlertSeverity.LOW,
                status=AlertStatus.ACKNOWLEDGED,
                source="Fail2Ban",
                organization_id=org.id,
                asset_id=new_assets[0].id,
            ),
            Alert(
                title="Wireless Link Degraded (Low SNR)",
                description="SNR dropped below 15dB threshold. Possible alignment issue or weather fade.",
                severity=AlertSeverity.MEDIUM,
                status=AlertStatus.OPEN,
                source="Radio Poller",
                organization_id=org.id,
                wireless_link_id=wlink.id,
            ),
        ]
        db.add_all(alerts)
        await db.flush()

    await db.commit()
    logger.info("Demo data seeded successfully.")


async def main():
    async with async_session() as db:
        await seed_data(db)


if __name__ == "__main__":
    asyncio.run(main())
