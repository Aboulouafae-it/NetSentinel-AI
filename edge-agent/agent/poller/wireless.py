"""
Wireless SNMP Poller 

Crucial component for the WLI Data Pipe (Phase 2).
Normalizes chaotic, vendor-specific SNMP OIDs into standard 
NetSentinel AI RF Metrics for storage in the TSDB.
"""

import logging
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class NormalizedRFMetric:
    wireless_link_id: str
    timestamp: str
    rssi: Optional[float]
    snr: Optional[float]
    noise_floor: Optional[float]
    ccq: Optional[float]
    tx_capacity: Optional[int]
    rx_capacity: Optional[int]


class VendorOIDs:
    """SNMP OID maps for popular wireless backhaul vendors."""
    
    # UBNT-AirMAX-MIB
    UBIQUITI = {
        "rssi": "1.3.6.1.4.1.41112.1.4.1.1.4.1",
        "noise_floor": "1.3.6.1.4.1.41112.1.4.1.1.5.1",
        "ccq": "1.3.6.1.4.1.41112.1.4.1.1.6.1",
        "tx_rate": "1.3.6.1.4.1.41112.1.4.1.1.7.1",
        "rx_rate": "1.3.6.1.4.1.41112.1.4.1.1.8.1",
    }
    
    # MIKROTIK-MIB
    MIKROTIK = {
        "rssi": "1.3.6.1.4.1.14988.1.1.1.2.1.3",
        "noise_floor": "1.3.6.1.4.1.14988.1.1.1.2.1.4",
        "ccq": "1.3.6.1.4.1.14988.1.1.1.2.1.8",
        "tx_rate": "1.3.6.1.4.1.14988.1.1.1.2.1.5",
        "rx_rate": "1.3.6.1.4.1.14988.1.1.1.2.1.6",
    }


class WirelessPoller:
    def __init__(self, snmp_client):
        self.snmp = snmp_client

    async def poll_radio(self, link_id: str, ip_address: str, community: str, vendor: str) -> NormalizedRFMetric:
        """
        Polls a specific radio and normalizes the data regardless of the hardware vendor.
        This achieves the hardware-agnostic mandate of the WLI pillar.
        """
        logger.info(f"Polling [{vendor}] radio at {ip_address} for Link {link_id[:8]}...")
        
        oids = VendorOIDs.UBIQUITI if vendor.lower() == "ubiquiti" else VendorOIDs.MIKROTIK

        try:
            # Dispatch network request to edge device
            results = await self.snmp.get_bulk(
                ip_address, 
                community, 
                [oids["rssi"], oids["noise_floor"], oids["ccq"], oids["tx_rate"], oids["rx_rate"]]
            )

            # --- Data Normalization ---
            
            # 1. Parse raw string values
            rssi = float(results.get(oids["rssi"], 0))
            noise = float(results.get(oids["noise_floor"], -96))
            
            # 2. Derive SNR (Signal-to-Noise Ratio)
            # Essential deterministic metric, often missing in native SNMP
            snr = rssi - noise if rssi and noise else None

            # 3. Construct unified DTO
            metric = NormalizedRFMetric(
                wireless_link_id=link_id,
                timestamp=datetime.utcnow().isoformat() + "Z",
                rssi=rssi,
                snr=snr,
                noise_floor=noise,
                ccq=float(results.get(oids["ccq"])) if results.get(oids["ccq"]) else None,
                tx_capacity=int(results.get(oids["tx_rate"])) if results.get(oids["tx_rate"]) else None,
                rx_capacity=int(results.get(oids["rx_rate"])) if results.get(oids["rx_rate"]) else None
            )
            
            logger.debug(f"Normalized Metric Result: SNR={metric.snr}dB, CCQ={metric.ccq}%")
            return metric

        except Exception as e:
            logger.error(f"Polling failure for {ip_address}: {e}")
            raise
