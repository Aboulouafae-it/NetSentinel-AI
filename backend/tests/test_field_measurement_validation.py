import pytest
from pydantic import ValidationError

from app.schemas.field_measurement import FieldMeasurementCreate


def test_field_measurement_accepts_realistic_values():
    measurement = FieldMeasurementCreate(
        link_name="Tower A to Tower B",
        rssi_dbm=-62,
        snr_db=31,
        noise_floor_dbm=-95,
        ccq_percent=97,
        latency_ms=3.5,
        packet_loss_percent=0.1,
        tx_capacity_mbps=250,
        rx_capacity_mbps=245,
    )

    assert measurement.link_name == "Tower A to Tower B"


@pytest.mark.parametrize(
    "field,value",
    [
        ("rssi_dbm", -130),
        ("snr_db", -1),
        ("noise_floor_dbm", -10),
        ("ccq_percent", 150),
        ("latency_ms", -1),
        ("packet_loss_percent", 101),
        ("tx_capacity_mbps", -5),
        ("rx_capacity_mbps", -5),
    ],
)
def test_field_measurement_rejects_invalid_ranges(field, value):
    payload = {"link_name": "Bad Link", field: value}

    with pytest.raises(ValidationError):
        FieldMeasurementCreate(**payload)
