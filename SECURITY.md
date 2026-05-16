# Security Policy

NetSentinel AI is a public-alpha security and network operations appliance
prototype. Do not treat the current repository as production-hardened software.

## Supported Versions

| Version / Track | Status |
| --- | --- |
| Public alpha / active development | Security issues accepted and reviewed |
| Desktop ISO / appliance builds | Validation track only unless a release says otherwise |

## Reporting A Vulnerability

If you find a security issue, use private reporting when available or contact
the repository owner directly. Do not publish exploit details, customer data,
tokens, or vulnerable endpoints in public issues.

Include:

- affected component,
- reproduction steps,
- expected impact,
- relevant logs or screenshots after redaction,
- suggested mitigation if known.

Do not include:

- secrets,
- `.env` content,
- private keys,
- raw captures,
- customer data,
- live cloud credentials,
- exploit weaponization beyond what is needed to prove impact.

## Local Deployment Notes

- Never use default/demo secrets outside a trusted lab.
- Generate a unique `SECRET_KEY` before any non-local use.
- Keep `.env` and `.env.production` private. Only example files should be
  committed.
- Do not expose PostgreSQL or Redis publicly.
- Put any non-local UI/API exposure behind HTTPS, a reverse proxy, and firewall
  rules.
- Treat Edge Agent tokens, credential profiles, backups, syslog data, and device
  captures as sensitive.
- Redact real device captures and review them manually before committing any
  fixture.
- Rotate agent tokens and credentials after demos or suspected exposure.
- Review dependencies before production deployment.

## Current Security Limitations

- Public alpha, not production-ready.
- RBAC, audit logging, credential storage hardening, rate limiting, and API abuse
  protection require further work.
- AI provider integration is disabled/foundation by default and must include
  redaction and operator approval before future external use.
- Cloud connectors are roadmap/foundation and must not store credentials until a
  secure credential design is implemented.

## Responsible Disclosure

Please avoid public exploit details until maintainers have had a reasonable
opportunity to triage. If the repository host supports private vulnerability
reports, use that path; otherwise contact the owner directly.
