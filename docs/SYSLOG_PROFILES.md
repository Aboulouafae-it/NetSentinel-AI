# NetSentinel AI Syslog Profiles

Syslog profiles normalize vendor logs into searchable metadata, activity
events, and deduplicated alert candidates. Profiles are ingest-only; they do not
change device configuration.

## Fortinet / FortiGate

Status: partial, fixture validated with synthetic/redacted FortiGate-style
key/value samples.

Supported parsing fields include:

- `date`, `time`, `eventtime`
- `devname`, `devid`, `vd`, `vdom`
- `type`, `subtype`, `level`
- `srcip`, `srcport`, `dstip`, `dstport`
- `srcintf`, `dstintf`
- `action`, `policyid`, `service`, `proto`, `app`
- `user`
- `msg`
- threat/UTM fields such as `attack`, `virus`, `threat`, and `threattype`

Supported categories:

- `firewall_blocked_traffic`
- `vpn_login_success`
- `vpn_login_failure`
- `admin_login_success`
- `admin_login_failure`
- `ips_attack_detected`
- `malware_detected`
- `web_filter_block`
- `interface_down`
- `interface_up`
- `ha_failover`
- `config_changed`
- `system_event`
- `unknown_fortinet_event`

Alerting is intentionally selective. NetSentinel creates or deduplicates alerts
for high-value events such as repeated login failures, IPS/malware detections,
HA failover, critical interface down, and configuration changes. It does not
create an alert for every single denied packet because FortiGate traffic logs
can be extremely noisy.

## Example FortiGate Format

```text
date=2026-05-07 time=10:04:00 devname="FGT-EDGE" devid="FGT60F0000000000" type="utm" subtype="ips" level="alert" srcip=198.51.100.14 dstip=192.0.2.50 action="blocked" attack="HTTP.URI.SQL.Injection" msg="IPS signature detected"
```

## FortiGate Forwarding Notes

On a real FortiGate, configure syslog forwarding to a trusted NetSentinel Edge
Agent or collector endpoint. Use TLS-capable transport or a private management
network where possible. Limit forwarding to logs needed for operations and
security monitoring.

For the current MVP, NetSentinel accepts authenticated HTTP syslog ingestion
from an Edge Agent. UDP syslog daemon support remains future work.

## Privacy And Security

- Redact usernames, public IPs, serial numbers, VDOM names, and policy names in
  fixtures unless they are synthetic examples.
- Do not send API keys, admin passwords, configuration exports, or private keys.
- Keep Edge Agent tokens protected and rotate them if exposed.
- Treat firewall logs as sensitive security data.

## Limitations

- Current Fortinet support is parser/classifier based, not a FortiManager or
  FortiGate API integration.
- MITRE mappings are placeholders and should be refined during threat-content
  tuning.
- Blocked traffic spike detection is conservative and does not yet perform
  time-window aggregation.
- Fixture validation uses synthetic samples until real redacted captures are
  added.
## v3.4 SOC Workspace Note

The `/security` page now surfaces syslog and Fortinet/FortiGate activity in the Security Operations Center workspace. Categories are displayed only when present in normalized log metadata or dashboard counters.

Current behavior:

- Latest syslog events are loaded from the existing logs API.
- Fortinet profile activity is identified from `vendor_profile`, category, parsed flow fields, action, and user metadata when present.
- Classification summaries are based on the currently loaded log page, not a full SIEM index.
- The evidence drawer redacts token, secret, password, credential, authorization, and API key fields before rendering metadata.
- No external threat intelligence APIs are called.
- No automatic blocking, isolation, or destructive response action is exposed.
