"""
NetSentinel AI — Edge Agent Entrypoint

This is a standalone Python application that runs on the customer's network,
polls local devices using SNMP, and securely transmits normalized telemetry 
to the NetSentinel backend platform.
"""

import asyncio
import logging
import uuid
import os

from agent.poller.snmp import AsyncSNMPClient
from agent.poller.wireless import WirelessPoller
from agent.transport.client import BackendClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
)
logger = logging.getLogger("EdgeAgent")

async def run_agent():
    logger.info("Initializing NetSentinel Edge Agent...")
    
    # 1. Initialize Core Subsystems
    snmp_client = AsyncSNMPClient(timeout=3, retries=2)
    wireless_poller = WirelessPoller(snmp_client)
    
    backend_url = os.getenv("NETSENTINEL_URL", "http://localhost:8000")
    backend_key = os.getenv("NETSENTINEL_AGENT_KEY", "edge-dev-key-123")
    transport = BackendClient(backend_url, backend_key)
    
    # 2. Configuration & Discovery (Mocked for Phase 2 implementation)
    # In production, this would be fetched dynamically from the backend
    # based on the Org ID assigned to this Edge Agent.
    demo_links = [
        {"id": str(uuid.uuid4()), "ip": "10.0.1.20", "community": "public", "vendor": "Ubiquiti"},
        {"id": str(uuid.uuid4()), "ip": "10.0.1.21", "community": "public", "vendor": "MikroTik"}
    ]

    logger.info(f"Loaded {len(demo_links)} wireless targets for active polling.")

    # 3. Main Event Loop
    try:
        while True:
            logger.info("--- Starting polling cycle ---")
            
            # Poll targets concurrently
            tasks = []
            for link in demo_links:
                tasks.append(
                    wireless_poller.poll_radio(
                        link_id=link["id"], 
                        ip_address=link["ip"], 
                        community=link["community"], 
                        vendor=link["vendor"]
                    )
                )
            
            metrics = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Push normalized results to backend
            push_tasks = []
            for metric in metrics:
                if not isinstance(metric, Exception):
                    push_tasks.append(transport.push_wireless_metric(metric))
                else:
                    logger.error(f"Polling cycle exception encountered: {metric}")
            
            await asyncio.gather(*push_tasks)
            
            # Sleep until next cycle 
            # (Production: 5 mins. Mocked: 10 seconds for observability testing)
            logger.info("Cycle complete. Sleeping for 10 seconds...")
            await asyncio.sleep(10)
            
    except asyncio.CancelledError:
        logger.info("Agent shutting down gracefully.")
    except KeyboardInterrupt:
        logger.info("Agent terminating due to system interrupt.")

if __name__ == "__main__":
    asyncio.run(run_agent())
