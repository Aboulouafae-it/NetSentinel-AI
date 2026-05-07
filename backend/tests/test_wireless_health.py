from types import SimpleNamespace

from app.services.wireless_health import diagnose_wireless_measurement


def test_wireless_health_excellent_link():
    measurement = SimpleNamespace(
        rssi_dbm=-55,
        snr_db=35,
        noise_floor_dbm=-96,
        ccq_percent=98,
        packet_loss_percent=0,
        latency_ms=2,
        tx_capacity_mbps=450,
        rx_capacity_mbps=440,
    )

    result = diagnose_wireless_measurement(measurement)

    assert result.health_score >= 90
    assert result.status == "Excellent"
    assert result.severity == "info"


def test_wireless_health_critical_link_identifies_rf_causes():
    measurement = SimpleNamespace(
        rssi_dbm=-86,
        snr_db=9,
        noise_floor_dbm=-74,
        ccq_percent=52,
        packet_loss_percent=8,
        latency_ms=140,
        tx_capacity_mbps=120,
        rx_capacity_mbps=25,
    )

    result = diagnose_wireless_measurement(measurement)

    assert result.health_score < 40
    assert result.status == "Critical"
    assert result.severity == "critical"
    assert result.recommended_actions
    assert "interference" in result.likely_root_cause.lower() or "misalignment" in result.likely_root_cause.lower()
