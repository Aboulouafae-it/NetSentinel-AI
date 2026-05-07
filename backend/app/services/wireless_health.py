"""
Deterministic wireless health scoring.

This module intentionally does not call an LLM. It converts real field
measurements into a repeatable health score, likely cause, severity, and
technician actions.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class WirelessHealthResult:
    health_score: int
    status: str
    severity: str
    likely_root_cause: str
    recommended_actions: list[str]
    evidence: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "health_score": self.health_score,
            "status": self.status,
            "severity": self.severity,
            "likely_root_cause": self.likely_root_cause,
            "recommended_actions": self.recommended_actions,
            "evidence": self.evidence,
        }


def _score_rssi(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 20, [], []
    if value >= -60:
        return 20, [f"RSSI {value} dBm is strong."], []
    if value >= -70:
        return 15, [f"RSSI {value} dBm is usable but below optimal."], []
    if value >= -80:
        return 8, [f"RSSI {value} dBm is weak."], ["antenna misalignment", "path obstruction"]
    return 2, [f"RSSI {value} dBm is critically weak."], ["severe antenna misalignment", "Fresnel obstruction", "cable or connector loss"]


def _score_snr(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 20, [], []
    if value >= 30:
        return 20, [f"SNR {value} dB is excellent."], []
    if value >= 22:
        return 15, [f"SNR {value} dB is acceptable."], []
    if value >= 14:
        return 8, [f"SNR {value} dB is low."], ["RF interference", "weak signal margin"]
    return 2, [f"SNR {value} dB is critically low."], ["heavy interference", "poor link budget"]


def _score_noise(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 15, [], []
    if value <= -95:
        return 15, [f"Noise floor {value} dBm is clean."], []
    if value <= -88:
        return 11, [f"Noise floor {value} dBm is mildly elevated."], []
    if value <= -80:
        return 6, [f"Noise floor {value} dBm is high."], ["channel interference", "congested spectrum"]
    return 1, [f"Noise floor {value} dBm is extremely high."], ["severe local RF interference", "bad channel plan"]


def _score_ccq(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 15, [], []
    if value >= 95:
        return 15, [f"CCQ {value}% is excellent."], []
    if value >= 85:
        return 12, [f"CCQ {value}% is good."], []
    if value >= 70:
        return 7, [f"CCQ {value}% indicates retransmissions."], ["frame retransmissions", "interference"]
    return 2, [f"CCQ {value}% is poor."], ["unstable RF link", "high retransmission rate"]


def _score_packet_loss(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 15, [], []
    if value <= 0.2:
        return 15, [f"Packet loss {value}% is minimal."], []
    if value <= 1:
        return 12, [f"Packet loss {value}% is low."], []
    if value <= 5:
        return 6, [f"Packet loss {value}% is service-affecting."], ["RF instability", "congestion"]
    return 1, [f"Packet loss {value}% is critical."], ["severe RF instability", "device overload", "failing link"]


def _score_latency(value: float | None) -> tuple[int, list[str], list[str]]:
    if value is None:
        return 10, [], []
    if value <= 5:
        return 10, [f"Latency {value} ms is excellent."], []
    if value <= 20:
        return 8, [f"Latency {value} ms is acceptable."], []
    if value <= 100:
        return 4, [f"Latency {value} ms is high."], ["retransmissions", "congestion"]
    return 1, [f"Latency {value} ms is extreme."], ["severe congestion", "link instability"]


def _score_capacity_symmetry(tx: float | None, rx: float | None) -> tuple[int, list[str], list[str]]:
    if tx is None or rx is None or tx <= 0 or rx <= 0:
        return 5, [], []
    low = min(tx, rx)
    high = max(tx, rx)
    ratio = low / high
    if ratio >= 0.8:
        return 5, [f"TX/RX capacity is balanced ({tx}/{rx} Mbps)."], []
    if ratio >= 0.55:
        return 3, [f"TX/RX capacity is moderately asymmetric ({tx}/{rx} Mbps)."], ["endpoint-specific interference"]
    return 1, [f"TX/RX capacity is highly asymmetric ({tx}/{rx} Mbps)."], ["one-sided interference", "TX power mismatch", "cable or antenna issue on one side"]


def _status_for_score(score: int) -> tuple[str, str]:
    if score >= 90:
        return "Excellent", "info"
    if score >= 75:
        return "Good", "low"
    if score >= 60:
        return "Degraded", "medium"
    if score >= 40:
        return "Poor", "high"
    return "Critical", "critical"


def _actions_for_causes(causes: list[str], status: str) -> list[str]:
    actions: list[str] = []
    joined = " ".join(causes).lower()
    if "interference" in joined or "spectrum" in joined or "channel" in joined:
        actions.append("Run a spectrum scan at both ends and move to a cleaner channel if confirmed.")
    if "misalignment" in joined or "obstruction" in joined or "fresnel" in joined:
        actions.append("Inspect line of sight and Fresnel zone, then perform a controlled antenna alignment sweep.")
    if "cable" in joined or "connector" in joined:
        actions.append("Inspect RF cables, pigtails, grounding, weather seals, and connectors for loss or water ingress.")
    if "congestion" in joined or "overload" in joined:
        actions.append("Check traffic load, radio CPU, queues, and capacity saturation during the incident window.")
    if "one-sided" in joined or "asymmetric" in joined or "tx power" in joined:
        actions.append("Compare both endpoints for noise floor, TX power, antenna alignment, and hardware faults.")
    if not actions:
        actions.append("Continue monitoring and compare the next measurement against this baseline.")
    if status in {"Poor", "Critical"}:
        actions.append("Create or update an incident and schedule field verification before service impact grows.")
    return actions


def diagnose_wireless_measurement(measurement: Any) -> WirelessHealthResult:
    scoring = [
        _score_rssi(getattr(measurement, "rssi_dbm", None)),
        _score_snr(getattr(measurement, "snr_db", None)),
        _score_noise(getattr(measurement, "noise_floor_dbm", None)),
        _score_ccq(getattr(measurement, "ccq_percent", None)),
        _score_packet_loss(getattr(measurement, "packet_loss_percent", None)),
        _score_latency(getattr(measurement, "latency_ms", None)),
        _score_capacity_symmetry(
            getattr(measurement, "tx_capacity_mbps", None),
            getattr(measurement, "rx_capacity_mbps", None),
        ),
    ]
    score = max(0, min(100, sum(item[0] for item in scoring)))
    evidence = [line for item in scoring for line in item[1]]
    causes = [cause for item in scoring for cause in item[2]]
    status, severity = _status_for_score(score)

    if causes:
        # Preserve order while de-duplicating.
        unique_causes = list(dict.fromkeys(causes))
        likely_root_cause = "; ".join(unique_causes[:3])
    else:
        likely_root_cause = "No strong RF fault signature detected from the provided values."

    return WirelessHealthResult(
        health_score=score,
        status=status,
        severity=severity,
        likely_root_cause=likely_root_cause,
        recommended_actions=_actions_for_causes(causes, status),
        evidence=evidence or ["Insufficient RF/performance values provided; score assumes missing metrics are neutral."],
    )
