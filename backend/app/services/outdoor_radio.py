"""Outdoor radio profile helpers for long-range wireless links."""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class OutdoorRadioProfile:
    device_family: str
    link_role: str = "unknown"
    topology_role: str = "point_to_point"
    frequency_band: str | None = None
    channel_width_mhz: float | None = None
    antenna_alignment_notes: list[str] = field(default_factory=list)
    manual_rf_measurement_fallback: bool = True
    automatic_metrics_source: str | None = None
    limitations: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def outdoor_profile_for_radio(radio, source: str | None = None, wireless_available: bool = False) -> OutdoorRadioProfile:
    role = getattr(radio, "role", "unknown")
    role_value = role.value if hasattr(role, "value") else str(role or "unknown")
    frequency = getattr(radio, "frequency_mhz", None)
    if frequency is None:
        band = None
    elif frequency >= 57000:
        band = "60GHz"
    elif frequency >= 4900:
        band = "5GHz"
    elif frequency >= 2300:
        band = "2.4GHz"
    else:
        band = "unknown"

    return OutdoorRadioProfile(
        device_family="outdoor_radio",
        link_role=role_value,
        topology_role="point_to_multipoint" if role_value == "access_point" else "point_to_point",
        frequency_band=band,
        channel_width_mhz=getattr(radio, "channel_width_mhz", None),
        antenna_alignment_notes=[
            "Use manual RSSI/SNR/noise/CCQ field measurements when adapter RF metrics are missing.",
            "Record both near-end and far-end readings before changing alignment.",
        ],
        manual_rf_measurement_fallback=not wireless_available,
        automatic_metrics_source=source if wireless_available else None,
        limitations=[] if wireless_available else ["Automatic RF metrics are not available from the selected adapter."],
    )
