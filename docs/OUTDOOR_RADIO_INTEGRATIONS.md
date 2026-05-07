# Outdoor Radio Integrations

NetSentinel AI treats outdoor wireless radios as field systems where automatic
telemetry and manual RF measurements both matter.

## Manual vs Automatic RF Metrics

Automatic adapter metrics are preferred when they come from real device APIs or
known OIDs. Missing RF values are never inferred. When an adapter cannot provide
RSSI, SNR, noise floor, CCQ, rates, frequency, or channel width, NetSentinel
stores a partial snapshot and asks for a manual field measurement.

Manual field measurements remain the most reliable fallback for:

- antenna alignment
- Fresnel obstruction checks
- interference investigation
- validating near-end vs far-end readings

## Current Adapter Status

- Generic SNMP: device/interface data, no RF claims; fixture validated with synthetic standard SNMP output.
- MikroTik RouterOS: read-only normalized RouterOS data through a mockable client; fixture validated with synthetic command rows.
- TP-Link CPE: SNMP-backed CPE foundation; RF only from explicit fixture/OID data; fixture validated for both missing and present RF fields.
- Ubiquiti airMAX / UISP: SNMP-backed outdoor adapter foundation; UISP API placeholder; fixture validated for missing RF fields and explicit airMAX-style RF fields.
- Cambium: planned placeholder.

## Fixture Lab

Adapter confidence is tracked through fixture-backed tests in
`backend/tests/fixtures/devices`. Add one fixture per transport or output shape:

- normalized SNMP poll output
- vendor command output rows
- wireless RF output when real fields are known
- manual RF measurement fallback examples
- syslog samples with expected classifications

Fixtures must state whether they are `synthetic`, `real_redacted`, or
`documentation_sample`. Missing RF data should remain missing; tests should prove
NetSentinel does not fabricate RSSI, SNR, noise floor, or quality metrics.

## Recommended Workflow

1. Register near-end and far-end radio devices.
2. Link radios to a wireless link.
3. Add scoped read-only credentials where available.
4. Poll each radio.
5. Review adapter capabilities and missing fields.
6. Save manual field measurements for missing RF values.
7. Use the deterministic wireless health diagnosis to decide field actions.

## Limitations

- Vendor RF metrics vary by firmware, product line, and management interface.
- SNMP MIB support is inconsistent across outdoor CPE devices.
- NetSentinel does not scrape web UIs by default.
- No adapter performs configuration changes in the current appliance line.
- Ubiquiti UniFi, airMAX, LTU, airFiber, and UISP-managed radios are different
  integration families; support must be validated with fixtures per family.
