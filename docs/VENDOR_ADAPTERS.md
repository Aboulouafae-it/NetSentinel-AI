# NetSentinel AI Vendor Adapters

v0.9 introduced a normalized adapter architecture for managed network and radio
devices. The core platform talks to adapter interfaces, not directly to a
specific vendor API.

## Adapter Contract

Every adapter implements:

- `test_connection()`
- `get_device_info()`
- `get_interfaces()`
- `get_health()`
- `get_wireless_metrics()`
- `get_capabilities()`

Outputs are normalized into vendor-independent structures:

- `DeviceInfo`
- `InterfaceSnapshot`
- `DeviceHealth`
- `WirelessMetricsSnapshot`
- `AdapterCapabilities`

## Support Matrix

| Vendor / Profile | Transport | Status | Fixture Confidence | Real Capture | Notes |
| --- | --- | --- | --- | --- | --- |
| Generic SNMP | SNMP v2c | Supported foundation / Partial | Synthetic fixture validated | Real capture needed | Standard system/interface data; no RF claims |
| MikroTik RouterOS | RouterOS API wrapper | Partial / adapter foundation | Synthetic fixture validated | Real capture needed | Read-only foundation; live transport field verification needed |
| TP-Link CPE | SNMP v2c + ping | Partial | Synthetic fixture validated | Real capture needed | RF metrics need real OIDs/API captures; manual RF often required |
| Ubiquiti airMAX / UISP | SNMP v2c + UISP placeholder | Partial | Synthetic fixture validated | Real capture needed | airMAX foundation; UISP placeholder; UniFi not supported |
| Fortinet / FortiGate syslog | HTTP syslog ingest | Partial | Synthetic fixture validated | Real capture needed | Syslog-only; no API/configuration changes |
| Cambium | TBD | Placeholder | None | Needed | Planned |
| Cisco / Aruba / Juniper | TBD | Planned | None | Needed | Planned network device profiles |
| AWS / Azure / GCP | Cloud APIs | Planned / future | None | Needed | Future cloud integrations |

The fixture lab lives under `backend/tests/fixtures/devices`. Current fixtures
are synthetic/redacted examples, not production customer captures. Real device
captures should be added only after secrets, serials, public IPs, usernames, and
site identifiers are removed.

Support confidence is now tracked separately:

- `synthetic_fixture_validated`: parser has synthetic/redacted example coverage.
- `real_capture_validated`: reviewed real-redacted captures are committed.
- `real_device_tested`: a maintainer has tested against a real device.
- `transport_tested`: live protocol transport has been exercised safely.
- `rf_metrics_verified`: RF fields are proven from real device output.
- `manual_required`: manual field measurements remain required for complete RF health.

As of v1.7, no reviewed real device captures are committed yet.

## Supported Now

### `generic_snmp`

Generic SNMP uses safe read-only SNMP v2c polling through the existing SNMP
foundation. It can collect:

- `sysName`
- `sysDescr`
- `sysUpTime`
- interface names
- interface operational status
- interface octet counters
- interface error counters

Generic SNMP does not claim wireless RF support because standard SNMP MIBs do
not reliably expose RSSI, SNR, noise floor, CCQ, channel width, or frequency
across vendors. When these fields are unavailable, NetSentinel stores a partial
wireless snapshot with explicit `missing_fields`.

### `mikrotik_routeros`

v1.1 adds the first real vendor-specific adapter for MikroTik RouterOS. The
adapter is read-only by design and uses a mockable RouterOS client wrapper.
Until a RouterOS API transport dependency is finalized, production deployments
should treat the transport as an integration point to configure and test.

Supported normalized data:

- identity name from `/system/identity/print`
- model, RouterOS version, uptime, platform, CPU load, and memory from
  `/system/resource/print`
- interface names, running/down state, and counters from `/interface/print`
- wireless registration metrics from `/interface/wireless/registration-table/print`
  or `/interface/wifi/registration-table/print` when available
- limited logs through `/log/print` as a read-only capability

No configuration-changing commands are performed.

### `tplink_cpe`

v1.2 adds a safe TP-Link CPE / outdoor radio adapter foundation for devices
such as CPE710. The MVP transport is Generic SNMP composition plus explicit
fixture/OID parsing for RF fields when available.

Supported now:

- SNMP reachability through the adapter health path
- `sysName`, `sysDescr`, and `sysUpTime`
- interface names, operational status, counters, and errors
- partial wireless snapshots with explicit missing fields
- RF metric normalization only when real TP-Link fixture/OID keys are supplied

Not supported yet:

- fragile web scraping
- configuration changes
- claimed TP-Link RF support without real OIDs/fixtures
- authenticated HTTP/API transport

To test with a TP-Link CPE710, enable SNMP read-only access on the device, create
a scoped `snmp_v2c` credential profile, register the radio with vendor `tplink`
and adapter type `tplink_cpe`, then poll the radio. If RF metrics are missing,
collect manual field measurements and attach them to the wireless link.

### `ubiquiti_airmax`

v1.3 adds a Ubiquiti airMAX / UISP outdoor radio adapter foundation for devices
such as NanoStation, NanoBeam, PowerBeam, LiteBeam, Rocket, airFiber, LTU, and
UISP-managed radios.

Supported now:

- SNMP reachability through the adapter health path
- `sysName`, `sysDescr`, and `sysUpTime`
- interface names, operational status, counters, and errors
- family/model detection from SNMP description when present
- partial wireless snapshots with explicit missing fields
- RF metric normalization only from explicit Ubiquiti fixture/OID keys

UISP API support is represented as a placeholder capability only. UniFi devices
are separate from airMAX/UISP outdoor radios and are not claimed by this adapter.

To test with a PowerBeam, NanoBeam, LiteBeam, Rocket, or similar airMAX radio,
enable read-only SNMP, create a scoped `snmp_v2c` credential profile, register
the radio with vendor `ubiquiti` and adapter type `ubiquiti_airmax`, then poll
the radio. If RF metrics are missing, capture manual field measurements and
attach them to the wireless link.

## Placeholders

The following adapters remain placeholders:

- `cambium`

They expose `configured=false`, report `not_configured`, and do not fake device
or RF metrics.

## Syslog Security Profiles

Fortinet/FortiGate support is provided as a syslog security profile rather than
a configuration adapter. NetSentinel parses FortiGate key/value syslog, stores
normalized fields, classifies security events, creates activity events, and
deduplicates high-value alerts. It does not call FortiGate APIs or change
firewall configuration.

See `docs/SYSLOG_PROFILES.md` for supported Fortinet categories, sample formats,
forwarding notes, and limitations.

## Credentials

Generic SNMP, TP-Link CPE, and Ubiquiti airMAX require a scoped `snmp_v2c` credential profile.
MikroTik requires a scoped `routeros` credential profile:

- `username`
- `secret_material` as the password
- optional `config.port`, default `8728`
- optional `config.use_tls`, reserved for TLS transport support

Secrets are not returned by credential APIs. SNMPv3 and API tokens are modeled
for future adapters.

For a real RouterOS device, create a least-privilege read-only RouterOS user,
create a `routeros` credential profile in NetSentinel, register the radio with
vendor `mikrotik` and adapter type `mikrotik_routeros`, then run Poll Now with
that credential.

## Wireless Health

`WirelessMetricsSnapshot` normalizes:

- RSSI
- SNR
- noise floor
- CCQ
- TX/RX rates
- frequency and channel width
- latency and packet loss
- source and confidence
- missing fields

If enough RF fields exist, the deterministic wireless health engine calculates a
score. If not, the diagnosis is partial and explains what data is missing.

## Adding an Adapter

1. Add a class under `backend/app/adapters`.
2. Implement the `DeviceAdapter` contract.
3. Return normalized dataclasses only.
4. Keep secrets in credential profiles, not radio device records.
5. Register selection logic in `app.services.vendor_adapters.select_adapter`.
6. Add redacted fixture files under `backend/tests/fixtures/devices/<vendor>`.
7. Add tests with mocked device responses loaded from those fixture files.

## Security Notes

- Use read-only credentials.
- Create a dedicated RouterOS user with read-only permissions.
- Never log secrets or return them in API responses.
- Treat vendor API tokens like appliance secrets.
- Prefer scoped organization credentials.
- Keep network timeouts short and avoid broad scans from adapter code.
- Verify RouterOS API exposure is limited to trusted management networks.
- Keep TP-Link SNMP read-only and limited to trusted management networks.
- Keep Ubiquiti SNMP read-only and limited to trusted management networks.
- Treat UISP API tokens as high-value secrets when future support is enabled.
