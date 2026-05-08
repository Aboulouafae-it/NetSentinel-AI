# NetSentinel AI Real Device Capture Guide

This guide explains how to collect, redact, review, and import real device
captures for adapter validation. Raw captures must never be committed.

## Safety Rules

- Keep raw captures outside the repository, for example `~/netsentinel-raw-captures`.
- Do not commit raw syslog, SNMP walks, RouterOS output, API responses, database
  dumps, secrets, tokens, private keys, usernames, public IPs, serial numbers,
  customer names, or site identifiers.
- Run `tools/redact_device_capture.py` before copying anything into
  `backend/tests/fixtures/devices`.
- Manually review redacted output before committing.
- Store reviewed captures only under
  `backend/tests/fixtures/devices/<vendor>/real_redacted/`.

`.gitignore` excludes common raw capture paths, but review is still required.

## Redaction Tool

```bash
python tools/redact_device_capture.py ~/netsentinel-raw-captures/fortigate.log \
  --output backend/tests/fixtures/devices/syslog/fortinet/real_redacted/fortigate_reviewed.log \
  --redact-private-ips \
  --redact-hostnames \
  --customer-name "Example Customer"
```

The tool redacts:

- public IPs by default
- private IPs when `--redact-private-ips` is used
- MAC addresses
- emails
- usernames in common key/value fields
- serial numbers and device IDs
- passwords, secrets, tokens, API keys, SNMP communities
- hostnames/device names when `--redact-hostnames` is used
- customer names supplied with `--customer-name`

It preserves structure such as `srcip=`, `devname=`, and RouterOS/SNMP-style
rows so parser tests still exercise real shapes.

## Metadata

Every reviewed capture set should include a `capture_metadata.json` file:

```json
{
  "device_family": "FortiGate 60F",
  "firmware_version": "7.x redacted",
  "capture_method": "syslog forwarding",
  "date": "2026-05-07",
  "redaction_status": "real_redacted",
  "supported_fields": ["devname", "srcip", "dstip", "action", "msg"],
  "missing_fields": ["policy_name"],
  "notes": "Reviewed by maintainer; raw capture not committed."
}
```

## MikroTik Capture Commands

Use a read-only RouterOS user.

```text
/system/identity/print
/system/resource/print
/interface/print detail
/ip/address/print
/interface/wireless/registration-table/print detail
/interface/wifi/registration-table/print detail
/log/print count-only
/log/print where topics~"account|interface|wireless"
```

Do not export configuration. Redact usernames, MACs, public IPs, serials, and
site names.

## Generic SNMP / TP-Link / Ubiquiti Capture Commands

Use read-only SNMP credentials from a trusted management host.

```bash
snmpget -v2c -c '<community>' <ip> 1.3.6.1.2.1.1.1.0
snmpget -v2c -c '<community>' <ip> 1.3.6.1.2.1.1.3.0
snmpget -v2c -c '<community>' <ip> 1.3.6.1.2.1.1.5.0
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.2
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.8
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.10
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.16
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.14
snmpwalk -v2c -c '<community>' <ip> 1.3.6.1.2.1.2.2.1.20
```

For TP-Link CPE710 and Ubiquiti airMAX, capture any known RF/wireless OIDs only
if you can identify them safely. If RF is unavailable, keep `missing_fields`
honest and continue using manual field measurements.

Do not add UniFi captures to the Ubiquiti airMAX adapter path.

## FortiGate Syslog Capture

Forward FortiGate logs to a trusted NetSentinel Edge Agent or temporary local
collector on a private management network. Capture examples for:

- denied traffic
- VPN login success/failure
- admin login failure
- IPS attack
- malware/antivirus event
- web filter block
- interface down/up
- HA failover
- configuration change

Example FortiGate-style log:

```text
date=2026-05-07 time=10:04:00 devname="FGT-EDGE" devid="FGT60F..." type="utm" subtype="ips" level="alert" srcip=198.51.100.14 dstip=192.0.2.50 action="blocked" attack="HTTP.URI.SQL.Injection" msg="IPS signature detected"
```

Redact `devname`, `devid`, IPs, usernames, VDOM/site/customer names, policy
names, and any unique identifiers before commit.

## Import Checklist

1. Capture raw output outside the repo.
2. Run `tools/redact_device_capture.py`.
3. Manually review redacted output.
4. Add reviewed files under `<vendor>/real_redacted/`.
5. Add `capture_metadata.json`.
6. Add or update parser tests.
7. Update `backend/app/adapters/support_matrix.py` confidence flags only after
   tests pass and review is complete.

## Current Status

As of v1.7, NetSentinel has synthetic fixture validation for Generic SNMP,
MikroTik, TP-Link CPE, Ubiquiti airMAX, and Fortinet syslog. No real-redacted
captures are committed yet.
