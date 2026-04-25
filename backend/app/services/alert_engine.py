"""
NetSentinel AI — Threshold Alert Engine

Generates REAL alerts based on actual field measurement data.
No simulated alerts. Every alert is traceable to a real measurement
that crossed a defined threshold.

This replaces the previous empty alerts list with actionable alerts
generated from actual RF readings.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.field_measurement import FieldMeasurement
from app.models.alert import Alert, AlertSeverity, AlertStatus


# Thresholds that trigger real alerts
THRESHOLDS = {
    "rssi_warning": -70.0,       # dBm
    "rssi_critical": -80.0,      # dBm
    "snr_warning": 20.0,         # dB
    "snr_critical": 12.0,        # dB
    "noise_warning": -85.0,      # dBm (above this = warning)
    "noise_critical": -75.0,     # dBm
    "ccq_warning": 80.0,         # % (below this = warning)
    "ccq_critical": 60.0,        # %
    "latency_warning": 20.0,     # ms
    "latency_critical": 100.0,   # ms
    "loss_warning": 1.0,         # %
    "loss_critical": 5.0,        # %
}


async def evaluate_measurement(measurement: FieldMeasurement, db: AsyncSession) -> list[Alert]:
    """
    Evaluate a real field measurement against thresholds.
    Creates alert records in the database for any threshold violations.
    Returns list of created alerts.
    """
    alerts_created = []
    now = datetime.now(timezone.utc)
    source = f"FieldMeasurement:{measurement.id}"

    checks = []

    # RSSI checks
    if measurement.rssi_dbm is not None:
        if measurement.rssi_dbm < THRESHOLDS["rssi_critical"]:
            checks.append(("critical", f"Critical RSSI on {measurement.link_name}",
                f"RSSI is {measurement.rssi_dbm} dBm (threshold: {THRESHOLDS['rssi_critical']} dBm). "
                f"Link {measurement.link_name} ({measurement.origin_site} → {measurement.destination_site}) "
                f"has critically weak signal."))
        elif measurement.rssi_dbm < THRESHOLDS["rssi_warning"]:
            checks.append(("high", f"Low RSSI on {measurement.link_name}",
                f"RSSI is {measurement.rssi_dbm} dBm (threshold: {THRESHOLDS['rssi_warning']} dBm). "
                f"Signal strength degraded on link {measurement.link_name}."))

    # SNR checks
    if measurement.snr_db is not None:
        if measurement.snr_db < THRESHOLDS["snr_critical"]:
            checks.append(("critical", f"Critical SNR on {measurement.link_name}",
                f"SNR is {measurement.snr_db} dB. Signal quality is critically low."))
        elif measurement.snr_db < THRESHOLDS["snr_warning"]:
            checks.append(("high", f"Low SNR on {measurement.link_name}",
                f"SNR is {measurement.snr_db} dB. Signal quality is degraded."))

    # Noise floor checks
    if measurement.noise_floor_dbm is not None:
        if measurement.noise_floor_dbm > THRESHOLDS["noise_critical"]:
            checks.append(("critical", f"Extreme noise on {measurement.link_name}",
                f"Noise floor is {measurement.noise_floor_dbm} dBm. Heavy RF interference detected."))
        elif measurement.noise_floor_dbm > THRESHOLDS["noise_warning"]:
            checks.append(("high", f"Elevated noise on {measurement.link_name}",
                f"Noise floor is {measurement.noise_floor_dbm} dBm. Possible interference."))

    # Packet loss checks
    if measurement.packet_loss_percent is not None:
        if measurement.packet_loss_percent > THRESHOLDS["loss_critical"]:
            checks.append(("critical", f"High packet loss on {measurement.link_name}",
                f"Packet loss is {measurement.packet_loss_percent}%. Service impact likely."))
        elif measurement.packet_loss_percent > THRESHOLDS["loss_warning"]:
            checks.append(("high", f"Packet loss on {measurement.link_name}",
                f"Packet loss is {measurement.packet_loss_percent}%."))

    # Latency checks
    if measurement.latency_ms is not None:
        if measurement.latency_ms > THRESHOLDS["latency_critical"]:
            checks.append(("critical", f"Extreme latency on {measurement.link_name}",
                f"Latency is {measurement.latency_ms} ms."))
        elif measurement.latency_ms > THRESHOLDS["latency_warning"]:
            checks.append(("high", f"High latency on {measurement.link_name}",
                f"Latency is {measurement.latency_ms} ms."))

    # CCQ checks
    if measurement.ccq_percent is not None:
        if measurement.ccq_percent < THRESHOLDS["ccq_critical"]:
            checks.append(("critical", f"Critical CCQ on {measurement.link_name}",
                f"CCQ is {measurement.ccq_percent}%. Connection quality severely degraded."))
        elif measurement.ccq_percent < THRESHOLDS["ccq_warning"]:
            checks.append(("high", f"Low CCQ on {measurement.link_name}",
                f"CCQ is {measurement.ccq_percent}%. Connection quality degraded."))

    # Create alert records
    for severity, title, description in checks:
        alert = Alert(
            title=title,
            description=description,
            severity=AlertSeverity(severity),
            status=AlertStatus.OPEN,
            source=source,
        )
        db.add(alert)
        alerts_created.append(alert)

    if alerts_created:
        await db.flush()

    return alerts_created
