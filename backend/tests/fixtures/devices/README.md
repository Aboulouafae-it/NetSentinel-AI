# NetSentinel Device Fixture Lab

These fixtures validate adapter parsing and syslog classification without contacting live devices.

All fixtures currently in this tree are synthetic, documentation-style, or redacted examples. When adding real captures:

- Use read-only commands only.
- Remove or replace public IPs, private hostnames, usernames, serial numbers, passwords, tokens, and community strings.
- Replace MAC addresses with documentation ranges such as `00:11:22:33:44:55`.
- Keep the original command or transport in the fixture metadata.
- Mark `sample_type` as `real_redacted`, `synthetic`, or `documentation_sample`.
- Do not include configuration exports unless they have been reviewed for secrets.

Fixtures should make missing vendor data explicit. Tests must not infer RF metrics that the fixture does not contain.
