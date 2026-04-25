"""
NetSentinel AI — Security Test Seeder

Creates detection rules, IOCs, and logs to test the Threat Engine.
"""

import asyncio
import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import async_session
from app.models.organization import Organization
from app.models.security import DetectionRule, IndicatorOfCompromise
from app.models.log import LogEntry, LogLevel
from app.security.threat_engine import ThreatEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_security_test_data(db: AsyncSession):
    # 1. Get the demo organization
    result = await db.execute(select(Organization).where(Organization.name == "Acme Corp"))
    org = result.scalar_one_or_none()
    
    if not org:
        logger.error("Demo organization 'Acme Corp' not found. Please run seed.py first.")
        return

    logger.info(f"Using organization: {org.name} ({org.id})")

    # 2. Create Detection Rules
    logger.info("Creating detection rules...")
    rules_to_create = [
        {
            "name": "SSH Brute Force Detection",
            "description": "Detects multiple failed password attempts in SSH logs.",
            "severity": "high",
            "target_field": "message",
            "condition": "contains",
            "pattern": "failed password for root",
        },
        {
            "name": "Nmap Scan Activity",
            "description": "Detects potential network scanning activity.",
            "severity": "medium",
            "target_field": "source",
            "condition": "contains",
            "pattern": "nmap-scanner",
        }
    ]

    for r_data in rules_to_create:
        existing = await db.execute(select(DetectionRule).where(DetectionRule.name == r_data["name"]))
        if not existing.scalar_one_or_none():
            rule = DetectionRule(**r_data, organization_id=org.id)
            db.add(rule)
    
    await db.flush()

    # 3. Create IOCs
    logger.info("Creating IOCs...")
    iocs_to_create = [
        {
            "ioc_type": "ip",
            "value": "194.26.135.210",
            "description": "Known malicious C2 server",
            "confidence": 95,
        },
        {
            "ioc_type": "domain",
            "value": "evil-malware-site.com",
            "description": "Phishing domain",
            "confidence": 85,
        }
    ]

    for i_data in iocs_to_create:
        existing = await db.execute(select(IndicatorOfCompromise).where(IndicatorOfCompromise.value == i_data["value"]))
        if not existing.scalar_one_or_none():
            ioc = IndicatorOfCompromise(**i_data, organization_id=org.id)
            db.add(ioc)

    await db.flush()
    await db.commit()

    # 4. Generate Logs to trigger the Engine
    logger.info("Generating logs to trigger the Threat Engine...")
    engine = ThreatEngine(db)

    test_logs = [
        {
            "message": "SSH login attempt: failed password for root from 192.168.1.50",
            "source": "auth-service",
            "level": LogLevel.WARNING,
        },
        {
            "message": "Inbound connection allowed from scanner",
            "source": "hq-fw-01-nmap-scanner",
            "level": LogLevel.INFO,
        },
        {
            "message": "Outgoing traffic to 194.26.135.210 detected",
            "source": "hq-core-sw-01",
            "level": LogLevel.INFO,
        }
    ]

    for l_data in test_logs:
        log_entry = LogEntry(**l_data, organization_id=org.id)
        db.add(log_entry)
        await db.flush()
        
        # Manually trigger the engine for these test logs
        logger.info(f"Evaluating log: {l_data['message'][:50]}...")
        await engine.evaluate_log(log_entry)

    await db.commit()
    logger.info("Security test data seeded and engine triggered successfully!")

async def main():
    async with async_session() as db:
        await seed_security_test_data(db)

if __name__ == "__main__":
    asyncio.run(main())
