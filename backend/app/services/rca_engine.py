"""
NetSentinel AI — Root Cause Analysis (RCA) Engine v1

Rule-based diagnostic engine that analyzes real wireless field measurements
and produces ranked probable causes with confidence scores.

This engine does NOT generate fake data. It reads real measurements from
the database and applies deterministic diagnostic rules based on RF engineering
principles.

Stage 1: Operates on manually-entered FieldMeasurement data.
Stage 2: Will also operate on auto-polled RFSnapshot data.
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ProbableCause:
    """A single diagnosed probable cause."""
    cause: str
    confidence: float  # 0.0 to 1.0
    description: str
    evidence: list[str]
    resembles: list[str]
    additional_checks: list[str]
    recommended_actions: list[str]


@dataclass
class DiagnosticReport:
    """Complete diagnostic output for a measurement."""
    measurement_id: str
    link_name: str
    timestamp: str
    overall_health: str  # 'healthy', 'warning', 'critical'
    health_score: int    # 0-100
    causes: list[ProbableCause]
    metric_summary: dict


# --- Expected baselines (configurable per-link in Stage 2) ---
DEFAULT_BASELINES = {
    "rssi_good": -60.0,       # dBm — anything above this is healthy
    "rssi_marginal": -72.0,   # dBm — below this is concerning
    "rssi_critical": -80.0,   # dBm — below this is failing
    "noise_good": -95.0,      # dBm — clean environment
    "noise_elevated": -85.0,  # dBm — interference likely
    "snr_good": 30.0,         # dB
    "snr_marginal": 20.0,     # dB
    "snr_critical": 12.0,     # dB
    "ccq_good": 95.0,         # %
    "ccq_marginal": 80.0,     # %
    "latency_good": 5.0,      # ms
    "latency_marginal": 20.0, # ms
    "loss_good": 0.5,         # %
    "loss_marginal": 2.0,     # %
}


def analyze_measurement(measurement) -> DiagnosticReport:
    """
    Analyze a single FieldMeasurement and produce a diagnostic report.
    
    This function applies deterministic RF diagnostic rules.
    Every conclusion is traceable to a specific metric comparison.
    No randomness. No guessing. Pure rule-based inference.
    """
    causes: list[ProbableCause] = []
    bl = DEFAULT_BASELINES

    rssi = measurement.rssi_dbm
    snr = measurement.snr_db
    noise = measurement.noise_floor_dbm
    ccq = measurement.ccq_percent
    latency = measurement.latency_ms
    loss = measurement.packet_loss_percent

    # Build metric summary
    metric_summary = {}
    health_score = 100

    # --- RSSI Analysis ---
    if rssi is not None:
        if rssi < bl["rssi_critical"]:
            metric_summary["rssi"] = "critical"
            health_score -= 35
        elif rssi < bl["rssi_marginal"]:
            metric_summary["rssi"] = "marginal"
            health_score -= 15
        else:
            metric_summary["rssi"] = "good"
    
    # --- Noise Floor Analysis ---
    if noise is not None:
        if noise > bl["noise_elevated"]:
            metric_summary["noise_floor"] = "elevated"
            health_score -= 20
        else:
            metric_summary["noise_floor"] = "good"

    # --- SNR Analysis ---
    if snr is not None:
        if snr < bl["snr_critical"]:
            metric_summary["snr"] = "critical"
            health_score -= 30
        elif snr < bl["snr_marginal"]:
            metric_summary["snr"] = "marginal"
            health_score -= 10
        else:
            metric_summary["snr"] = "good"

    # --- CCQ Analysis ---
    if ccq is not None:
        if ccq < bl["ccq_marginal"]:
            metric_summary["ccq"] = "degraded"
            health_score -= 15
        else:
            metric_summary["ccq"] = "good"

    # --- Latency Analysis ---
    if latency is not None:
        if latency > bl["latency_marginal"]:
            metric_summary["latency"] = "high"
            health_score -= 10
        elif latency > bl["latency_good"]:
            metric_summary["latency"] = "marginal"
            health_score -= 5
        else:
            metric_summary["latency"] = "good"

    # --- Packet Loss Analysis ---
    if loss is not None:
        if loss > bl["loss_marginal"]:
            metric_summary["packet_loss"] = "high"
            health_score -= 15
        elif loss > bl["loss_good"]:
            metric_summary["packet_loss"] = "marginal"
            health_score -= 5
        else:
            metric_summary["packet_loss"] = "good"

    health_score = max(0, min(100, health_score))

    # ============================================================
    # ROOT CAUSE PATTERN MATCHING
    # ============================================================

    # Pattern 1: RF Interference
    # High noise + degraded CCQ + relatively normal RSSI
    if (noise is not None and noise > bl["noise_elevated"] and
        ccq is not None and ccq < bl["ccq_good"] and
        (rssi is None or rssi > bl["rssi_marginal"])):
        causes.append(ProbableCause(
            cause="RF Interference",
            confidence=0.85,
            description=(
                "Noise floor is elevated above normal threshold, and connection quality "
                "is degraded while signal strength remains acceptable. This pattern strongly "
                "suggests external RF interference on the operating frequency."
            ),
            evidence=[
                f"Noise floor: {noise} dBm (threshold: {bl['noise_elevated']} dBm)",
                f"CCQ: {ccq}% (below {bl['ccq_good']}%)",
                f"RSSI: {rssi} dBm (still above marginal)" if rssi else "RSSI not measured",
            ],
            resembles=["Hardware degradation (but degradation also drops RSSI)"],
            additional_checks=[
                "Perform spectrum scan on operating frequency band",
                "Check if degradation follows a time-of-day pattern",
                "Try switching to a different channel temporarily",
            ],
            recommended_actions=[
                "Change operating frequency/channel to a cleaner band",
                "Narrow channel width to reduce noise capture",
                "If persistent, consider adding RF shielding or sector antenna",
            ],
        ))

    # Pattern 2: Misalignment
    # Low RSSI with normal noise floor
    if (rssi is not None and rssi < bl["rssi_marginal"] and
        (noise is None or noise <= bl["noise_elevated"])):
        conf = 0.75
        if rssi < bl["rssi_critical"]:
            conf = 0.85
        causes.append(ProbableCause(
            cause="Antenna Misalignment",
            confidence=conf,
            description=(
                "Signal strength is below expected level but noise floor is normal. "
                "This suggests the antenna is not properly aimed at the far-end, or "
                "there is a physical obstruction in the Fresnel zone."
            ),
            evidence=[
                f"RSSI: {rssi} dBm (expected above {bl['rssi_good']} dBm)",
                f"Noise floor: {noise} dBm (normal)" if noise else "Noise not measured",
            ],
            resembles=[
                "Fresnel zone obstruction (similar RSSI drop but usually gradual)",
                "Cable/connector loss (check cable and connectors first)",
            ],
            additional_checks=[
                "Use device alignment mode to check current alignment quality",
                "Inspect mounting hardware for looseness",
                "Verify far-end device is still powered and operational",
            ],
            recommended_actions=[
                "Re-align antenna using manufacturer alignment tool",
                "Check and tighten all mounting bolts",
                "Verify line-of-sight path is clear",
            ],
        ))

    # Pattern 3: Fresnel Zone Obstruction
    # Moderate RSSI drop + clean noise + no sudden change
    if (rssi is not None and bl["rssi_marginal"] <= rssi < bl["rssi_good"] and
        (noise is None or noise <= bl["noise_elevated"]) and
        (ccq is None or ccq >= bl["ccq_marginal"])):
        causes.append(ProbableCause(
            cause="Fresnel Zone Obstruction",
            confidence=0.50,
            description=(
                "RSSI is moderately below optimal but not critically low, with clean noise. "
                "This may indicate partial Fresnel zone obstruction from tree growth, "
                "new construction, or terrain features."
            ),
            evidence=[
                f"RSSI: {rssi} dBm (below optimal {bl['rssi_good']} dBm but not critical)",
            ],
            resembles=["Misalignment (check alignment first — it's easier to verify)"],
            additional_checks=[
                "Visual path survey — look for new obstacles",
                "Compare RSSI to original installation reading",
                "Check if seasonal (tree foliage in summer)",
            ],
            recommended_actions=[
                "Perform line-of-sight survey between both sites",
                "If vegetation: trim trees or raise antenna height",
                "If construction: consider relocating mount point",
            ],
        ))

    # Pattern 4: Cable / PoE Issues
    # High packet loss + high latency + otherwise decent RF
    if (loss is not None and loss > bl["loss_marginal"] and
        latency is not None and latency > bl["latency_marginal"] and
        (rssi is None or rssi > bl["rssi_marginal"])):
        causes.append(ProbableCause(
            cause="Cable or PoE Power Issue",
            confidence=0.70,
            description=(
                "High packet loss and latency with acceptable RF signal suggests "
                "the problem is in the physical layer — ethernet cable, connectors, "
                "or PoE power delivery rather than the radio link itself."
            ),
            evidence=[
                f"Packet loss: {loss}% (above {bl['loss_marginal']}%)",
                f"Latency: {latency} ms (above {bl['latency_marginal']} ms)",
                f"RSSI: {rssi} dBm (acceptable)" if rssi else "RSSI not measured",
            ],
            resembles=["Interference (but interference shows elevated noise floor)"],
            additional_checks=[
                "Check PoE voltage at the device (should be 24V or 48V depending on model)",
                "Inspect ethernet cable for damage, water ingress, or crushed sections",
                "Test cable with a cable tester",
                "Check surge protector — they degrade over time",
            ],
            recommended_actions=[
                "Replace ethernet cable run",
                "Replace PoE injector or adapter",
                "Check and clean all outdoor connectors",
                "Replace surge protector if installed",
            ],
        ))

    # Pattern 5: Hardware Degradation
    # Low RSSI + low SNR + everything else also degraded
    if (rssi is not None and rssi < bl["rssi_critical"] and
        snr is not None and snr < bl["snr_marginal"]):
        causes.append(ProbableCause(
            cause="Hardware Degradation",
            confidence=0.60,
            description=(
                "Both signal strength and signal quality are critically low. "
                "If alignment has been verified and cables are good, the radio "
                "hardware itself may be failing — common after 3-5 years outdoors."
            ),
            evidence=[
                f"RSSI: {rssi} dBm (critical)",
                f"SNR: {snr} dB (below marginal {bl['snr_marginal']} dB)",
            ],
            resembles=[
                "Misalignment (verify alignment first)",
                "Cable loss (verify cable first — cheaper to fix)",
            ],
            additional_checks=[
                "Verify alignment is correct",
                "Swap radio unit with a known-good spare",
                "Check TX power setting — is it at expected level?",
            ],
            recommended_actions=[
                "Replace radio unit if other causes are ruled out",
                "Check pigtail cable and antenna connector",
                "Consider upgrading to newer model if device is >4 years old",
            ],
        ))

    # Pattern 6: Mounting Instability / Wind
    # Noted in field notes, or marginal RSSI with variable readings
    if measurement.notes and any(
        kw in measurement.notes.lower() 
        for kw in ["wind", "sway", "unstable", "loose", "vibrat", "oscillat"]
    ):
        causes.append(ProbableCause(
            cause="Mounting Instability (Wind Sway)",
            confidence=0.75,
            description=(
                "Field notes mention instability-related keywords. Mounting instability "
                "causes RSSI to oscillate as the antenna sways, leading to intermittent "
                "degradation that may not show in a single snapshot reading."
            ),
            evidence=[
                f"Field notes mention instability indicators",
                f"Notes: \"{measurement.notes[:100]}...\"" if len(measurement.notes or '') > 100 else f"Notes: \"{measurement.notes}\"",
            ],
            resembles=["Interference (but noise floor stays stable during sway)"],
            additional_checks=[
                "Monitor RSSI variance over 1-hour period",
                "Physical inspection of mount — check for play/wobble",
                "Check wind conditions during degradation periods",
            ],
            recommended_actions=[
                "Reinforce mounting bracket with additional hardware",
                "Add guy wires if pole-mounted",
                "Use a heavier-duty mount rated for local wind conditions",
            ],
        ))

    # --- If nothing triggered, report healthy ---
    if not causes and health_score >= 80:
        pass  # No causes to report — link appears healthy

    # Sort by confidence
    causes.sort(key=lambda c: c.confidence, reverse=True)

    # Determine overall health
    if health_score >= 80:
        overall = "healthy"
    elif health_score >= 50:
        overall = "warning"
    else:
        overall = "critical"

    return DiagnosticReport(
        measurement_id=str(measurement.id),
        link_name=measurement.link_name,
        timestamp=datetime.utcnow().isoformat(),
        overall_health=overall,
        health_score=health_score,
        causes=causes,
        metric_summary=metric_summary,
    )
