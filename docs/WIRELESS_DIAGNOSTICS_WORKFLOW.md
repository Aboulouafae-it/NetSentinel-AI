# NetSentinel AI Wireless Diagnostics Workflow

**Version:** v2.5 Planning
**Status:** Workflow Specification

> **Accuracy notice:** This document describes operator workflows. Automatic RF
> metric retrieval is only claimed when a validated adapter exists for the specific
> device family and firmware version. NetSentinel never fabricates RSSI, SNR,
> noise floor, CCQ, or quality values.

---

## 1. RF Metrics Explained

### 1.1 RSSI (Received Signal Strength Indicator)

- Measured in **dBm** (decibels relative to 1 milliwatt)
- More negative = weaker signal
- Typical outdoor link targets:

| RSSI | Interpretation |
|---|---|
| > -60 dBm | Excellent |
| -60 to -70 dBm | Good |
| -70 to -80 dBm | Marginal |
| -80 to -85 dBm | Poor |
| < -85 dBm | Critical / link failure risk |

- Near-end and far-end RSSI may differ significantly due to antenna pattern and gain asymmetry

### 1.2 SNR (Signal-to-Noise Ratio)

- Measured in **dB** (relative difference, not absolute power)
- Higher is better
- Typical outdoor link targets:

| SNR | Interpretation |
|---|---|
| > 30 dB | Excellent |
| 20–30 dB | Good |
| 15–20 dB | Marginal |
| 10–15 dB | Poor |
| < 10 dB | Critical / high error rate |

### 1.3 Noise Floor

- Measured in **dBm**
- The ambient RF noise level at the receiver
- Lower (more negative) is better
- Typical acceptable range: < -85 dBm
- Elevated noise floor (e.g., -75 dBm) may indicate local interference even if RSSI looks acceptable

### 1.4 CCQ (Client Connection Quality)

- Ubiquiti/airMAX specific metric
- Percentage (0–100%)
- Combines multiple PHY-layer efficiency factors
- Target: > 85%
- Below 70%: investigate for interference, misalignment, or oversaturation

### 1.5 Latency and Packet Loss

- **Latency** (round-trip time in ms): baseline < 5ms on a clean PtP link;
  < 20ms acceptable for PtMP; > 50ms indicates a problem
- **Packet loss**: 0% expected on a healthy link; > 0.5% indicates a problem;
  > 5% is a service-affecting threshold

### 1.6 Health Score Interpretation

NetSentinel uses a deterministic scoring model:

| Score Range | Status | Meaning |
|---|---|---|
| 90–100 | Healthy | Link is within all acceptable thresholds |
| 70–89 | Degraded | One or more metrics are marginal; monitor closely |
| 50–69 | Poor | Multiple metrics failing; field intervention likely needed |
| 0–49 | Critical | Link is at risk of service failure; immediate action required |

The health score is calculated from RSSI, SNR, CCQ, latency, and packet loss.
Missing RF fields reduce confidence but do not fabricate a healthy score.

---

## 2. Device Workflows

### 2.1 Ubiquiti PowerBeam / airMAX PtP

**Supported data path:** SNMP (partial) or airOS API (planned)

Workflow:

1. Register near-end and far-end PowerBeam devices in NetSentinel
2. Assign scoped read-only SNMP credentials
3. Poll both devices
4. Review adapter output — check for RSSI, SNR, CCQ, TX/RX rate fields
5. If RF fields are missing: record a **manual field measurement**
6. In the manual measurement form, enter:
   - Near-end RSSI
   - Far-end RSSI
   - SNR (near and far if available)
   - Noise floor (from airOS dashboard)
   - CCQ (from airOS dashboard)
   - Latency (from built-in ping or `fping`)
   - Packet loss
7. Submit — NetSentinel calculates health score and opens an alert if thresholds are breached

**Antenna alignment triage:**

- Compare near-end TX to far-end RSSI; large asymmetry suggests antenna misalignment
- Adjust elevation first, then azimuth, watching real-time signal (airOS signal bar or wavemon)
- Target: RSSI within 3 dB of the link budget estimate

### 2.2 Ubiquiti NanoBeam / LiteBeam

**Supported data path:** SNMP (partial)

Workflow: identical to PowerBeam workflow above.

Notes:

- NanoBeam and LiteBeam are typically PtP or PtMP; CCQ behavior may differ by firmware
- LiteBeam AC may use airMAX AC-specific metrics; validate with fixture capture before claiming automatic support
- Manual RF fallback is the safest approach until a validated fixture exists

### 2.3 TP-Link CPE (CPE210, CPE510, CPE610, EAP)

**Supported data path:** SNMP (partial, limited RF OIDs)

Workflow:

1. Register near-end and far-end CPE devices
2. Assign SNMP credentials (community string; typically `public` for read-only unless changed)
3. Poll device — expect partial data; TP-Link SNMP RF OIDs are inconsistent by firmware
4. Review what fields are returned; if RSSI/SNR/CCQ are missing, proceed to manual measurement
5. Enter manual measurement using:
   - Signal level from CPE510/CPE610 local web UI (`Wireless > Site Survey` or `Status > Wireless`)
   - Noise from same source
   - TX/RX rate
   - `fping` or `ping` for latency and packet loss

**Missing RF fields:**

- TP-Link SNMP frequently does not expose RSSI/SNR as standard OIDs
- Do not claim automatic RF support until verified with a real capture fixture
- Manual RF measurement is the primary workflow for TP-Link CPE

### 2.4 MikroTik RouterOS (RB, wAP, SXT, Groove)

**Supported data path:** RouterOS CLI (via SSH or API; fixture validated)

Workflow:

1. Register MikroTik device with RouterOS credentials (read-only user recommended)
2. Assign scoped API or SSH credential profile
3. Poll device — NetSentinel adapter executes RouterOS commands for:
   - Interface status
   - Wireless registration table (`/interface wireless registration-table print`)
   - Signal strength, TX/RX rates, CCQ
4. Review fields — MikroTik typically exposes:
   - `signal-strength` (near-end RSSI)
   - `tx-signal-strength` (far-end RSSI as seen from near end)
   - `rx-rate`, `tx-rate`
   - `signal-to-noise`
   - `uptime`, `last-activity`
5. If link is PtP with dedicated wireless, CCQ equivalent is available
6. Submit health score review

**Manual RF fallback:**

- Use `wavemon` or the `iw` command on the appliance host if it has a compatible wireless card
- Or record readings from the MikroTik Winbox GUI (Signal Chart widget)

### 2.5 Manual RF Measurement Fallback

**Use when:** No validated adapter exists, or adapter returns incomplete RF data.

Steps:

1. Log into the device's management interface (web UI, Winbox, SSH, AirOS)
2. Record values from the device's current signal/statistics page:
   - RSSI or Signal Level (dBm)
   - SNR or Noise Margin (dB)
   - Noise Floor (dBm)
   - CCQ or similar quality metric (%)
   - TX and RX data rates
   - Link uptime
3. Use `fping -c 100 <device-ip>` for latency and packet loss stats
4. Open NetSentinel → Wireless → Manual Field Measurement form
5. Enter all available values; leave others blank (NetSentinel does not fill in unknown values)
6. Submit measurement — health score is calculated with available fields
7. Source confidence is set to "Manual" and recorded in the measurement

---

## 3. Alignment Triage

**Symptom:** Low RSSI, poor SNR, high latency

Triage steps:

1. Confirm physical mounting is intact (wind damage, ice, vibration check)
2. Check near-end and far-end RSSI asymmetry — large asymmetry (> 6 dB) suggests one-sided misalignment
3. Confirm Fresnel zone clearance — if terrain has changed (new construction, vegetation), recalculate
4. Use slow azimuth sweep while monitoring real-time signal (from device UI or `wavemon`)
5. Then slow elevation sweep
6. Record post-alignment measurement in NetSentinel

---

## 4. Interference Triage

**Symptom:** Elevated noise floor, high SNR variation, intermittent packet loss

Triage steps:

1. Check noise floor trend in NetSentinel (rising noise floor over time)
2. Identify frequency / channel in use (`iwlist scan` or device UI)
3. Scan for competing APs on the same channel (`iwlist <iface> scan` or from device scan)
4. Check for nearby new installations (towers, industrial equipment, video links)
5. If possible, change frequency/channel and compare metrics before/after
6. Record the interference observation as a diagnostic note

---

## 5. Source Confidence

NetSentinel tracks measurement source confidence:

| Source | Confidence Label |
|---|---|
| Validated adapter with real fixture | `adapter:validated` |
| Adapter with synthetic fixture only | `adapter:synthetic` |
| SNMP-based with known OIDs | `snmp:partial` |
| Manual operator input | `manual` |
| Estimated / calculated | `estimated` |

Unknown or fabricated values are never inserted. Partial measurements are stored as-is.

---

## 6. Missing RF Fields Behavior

If an adapter cannot retrieve RSSI, SNR, noise floor, CCQ, or rates:

- The field is stored as `null` — not zero, not a default
- The health score reflects the missing data (conservative scoring)
- NetSentinel prompts the operator to add a manual field measurement
- Health score confidence is labeled accordingly
- Alerts based on missing fields are not generated (cannot alert on data that was never collected)

---

## 7. Future Automation Roadmap

| Feature | Status |
|---|---|
| airOS HTTP API adapter | Future — requires validated capture fixture |
| Ubiquiti UISP API adapter | Future — UISP placeholder present |
| TP-Link Omada API adapter | Future — not yet designed |
| Cambium adapter | Planned — no fixture yet |
| Automatic antenna alignment assistant | Future — requires real-time signal feedback loop |
| Interference map overlay | Future — requires multiple sensors |
## v3.3 Workspace Note

The `/wireless` page now acts as the Wireless Diagnostics Pro landing workspace. It uses real wireless links, radio devices, field measurements, dashboard wireless health, and alert data. Manual field measurements are treated as the most reliable current RF source unless a radio adapter exposes supported wireless metrics.

Current behavior:

- Missing RF fields are shown explicitly.
- Manual measurements are labeled as manual/verified operator input.
- Adapter data is labeled as partial unless capabilities prove otherwise.
- Root cause and recommended actions are deterministic rule-based outputs from field measurements.
- No external AI provider, cloud API, customer capture, or raw capture is used by the workspace.
