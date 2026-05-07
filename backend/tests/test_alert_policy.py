from types import SimpleNamespace

from app.services.wireless_health import diagnose_wireless_measurement


def test_poor_or_critical_measurement_requires_alert_candidate():
    measurement = SimpleNamespace(
        rssi_dbm=-82,
        snr_db=13,
        noise_floor_dbm=-78,
        ccq_percent=61,
        packet_loss_percent=4,
        latency_ms=80,
        tx_capacity_mbps=90,
        rx_capacity_mbps=45,
    )

    diagnosis = diagnose_wireless_measurement(measurement)

    assert diagnosis.status in {"Poor", "Critical"}
    assert diagnosis.severity in {"high", "critical"}
