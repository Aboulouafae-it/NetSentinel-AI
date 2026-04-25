"""
Wireless Alert Matrices & Deterministic Logic

Phase 3 Core: Implements the hold-down timers, logic gates, and threshold 
evaluators for Wireless Link Intelligence to completely eliminate flap-storms
and false positives.
"""

import logging
from typing import List, Optional
from datetime import timedelta

from app.models.wireless import WirelessLink, WirelessMetric
from app.models.alert import Alert, AlertSeverity, AlertStatus

logger = logging.getLogger(__name__)

class AlertThresholds:
    RSSI_DELTA_WARNING = 5.0    # 5dB drop from expected = Warning
    RSSI_DELTA_CRITICAL = 10.0  # 10dB drop from expected = Critical
    SNR_MIN_CRITICAL = 15.0     # Below 15dB SNR is practically unusable
    CCQ_MIN_CRITICAL = 80.0     # CCQ below 80% requires alignment or spectrum check

class DeterministicEngine:
    def __init__(self, hold_down_minutes: int = 5):
        """
        Hold-down timer ensures we don't alert on transient spikes (e.g., a bird flying in front of the dish).
        Default hold-down is 5 minutes of sustained degradation.
        """
        self.hold_down_minutes = hold_down_minutes

    def evaluate_metrics(self, link: WirelessLink, metrics: List[WirelessMetric]) -> Optional[Alert]:
        """
        Evaluates a time-series window of metrics against the deterministic matrices.
        Returns an Alert object if the conditions are met and sustained.
        """
        if not metrics or len(metrics) < 2:
            return None # Not enough data
            
        # Ensure metrics are sorted oldest to newest for chronological evaluation
        sorted_metrics = sorted(metrics, key=lambda x: x.timestamp)
        
        # Check if the time window covers the hold-down requirement
        time_span = sorted_metrics[-1].timestamp - sorted_metrics[0].timestamp
        if time_span < timedelta(minutes=self.hold_down_minutes):
            return None # Has not met hold-down duration yet
            
        expected_rssi = link.expected_rssi_dbm
        if not expected_rssi:
            logger.warning(f"Link {link.name} missing Expected RSSI baseline. Cannot run delta analytics.")
            return None

        # --- Logic Gates (Hold-Down Verification) ---
        
        sustained_critical_rssi = True
        sustained_warning_rssi = True
        sustained_critical_snr = True
        sustained_critical_ccq = True
        
        for metric in sorted_metrics:
            # Note: Math reversed since RSSI is negative (-75 < -65)
            # If actual is -75 and expected is -65, expected - actual = -65 - (-75) = 10
            
            if metric.rssi is None or (expected_rssi - metric.rssi) < AlertThresholds.RSSI_DELTA_CRITICAL:
                sustained_critical_rssi = False
                
            if metric.rssi is None or (expected_rssi - metric.rssi) < AlertThresholds.RSSI_DELTA_WARNING:
                sustained_warning_rssi = False
                
            if metric.snr is None or metric.snr >= AlertThresholds.SNR_MIN_CRITICAL:
                sustained_critical_snr = False
                
            if metric.ccq is None or metric.ccq >= AlertThresholds.CCQ_MIN_CRITICAL:
                sustained_critical_ccq = False

        # --- Matrix Resolution ---
        
        # Matrix 1: Severe Degradation (Highest Priority)
        if sustained_critical_rssi or sustained_critical_snr:
            return Alert(
                title=f"Critical RF Degradation: {link.name}",
                description=f"Link has sustained a critical drop in signal quality for over {self.hold_down_minutes} minutes. "
                            f"Current RSSI is >10dB below baseline or SNR is <15dB.",
                severity=AlertSeverity.CRITICAL,
                status=AlertStatus.OPEN,
                source="WLI Deterministic Engine",
                organization_id=link.organization_id,
                wireless_link_id=link.id
            )
            
        # Matrix 2: Alignment Shift / Weather Fade
        if sustained_warning_rssi:
            return Alert(
                title=f"RF Alignment Shift: {link.name}",
                description=f"Link has sustained a 5dB+ drop from its expected baseline ({expected_rssi}dBm) "
                            f"for {self.hold_down_minutes} minutes. Investigate physical alignment or obstruction.",
                severity=AlertSeverity.HIGH,
                status=AlertStatus.OPEN,
                source="WLI Deterministic Engine",
                organization_id=link.organization_id,
                wireless_link_id=link.id
            )
            
        # Matrix 3: Interference / Spectrum Congestion
        if sustained_critical_ccq and not sustained_warning_rssi:
            return Alert(
                title=f"Spectrum Interference: {link.name}",
                description=f"Link RSSI is normal, but CCQ has remained below 80% for {self.hold_down_minutes} minutes. "
                            f"Strong indicator of localized channel interference.",
                severity=AlertSeverity.MEDIUM,
                status=AlertStatus.OPEN,
                source="WLI Deterministic Engine",
                organization_id=link.organization_id,
                wireless_link_id=link.id
            )
            
        return None
