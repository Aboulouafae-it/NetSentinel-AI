# Fortinet / FortiGate Syslog Fixtures

These fixtures are synthetic and redacted. They are shaped like common
FortiGate key/value syslog messages but are not customer captures.

When adding real FortiGate logs:

- Remove public IPs, usernames, serial numbers, device names, VDOM names, and policy names.
- Keep action/type/subtype fields intact when possible.
- Preserve enough fields to validate parser behavior.
- Mark samples as `real_redacted`.
- Do not include API tokens, admin passwords, configuration exports, or private keys.

NetSentinel ingests and classifies these logs only. It does not change firewall
configuration.
