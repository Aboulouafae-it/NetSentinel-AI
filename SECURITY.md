# Security Policy

NetSentinel AI is a public-alpha security and network operations appliance
prototype. Do not treat the current repository as production-hardened software.

## Supported Versions

| Version | Status |
|---------|--------|
| 2.0.0-alpha | Public alpha / active development |

## Reporting A Vulnerability

If you find a security issue, please open a private report or contact the repository owner directly instead of publishing exploit details in a public issue.

When reporting, include:

- affected component,
- reproduction steps,
- expected impact,
- logs or screenshots when useful,
- suggested mitigation if known.

## Local Deployment Notes

- Never use default/demo secrets outside a trusted lab.
- Generate a unique `SECRET_KEY` before any non-local use.
- Keep `.env` and `.env.production` private. Only examples should be committed.
- Do not expose PostgreSQL or Redis publicly.
- Put any non-local UI/API exposure behind HTTPS, a reverse proxy, and firewall
  rules.
- Treat Edge Agent tokens, credential profiles, backups, and syslog data as
  sensitive.
- Redact real device captures with `tools/redact_device_capture.py` and review
  manually before committing reviewed fixtures.
- Rotate agent tokens and credentials after demos or suspected exposure.
- Review dependencies regularly before production deployment.

## Responsible Disclosure

Please avoid public exploit details until maintainers have had a reasonable
opportunity to triage. If the repository host supports private vulnerability
reports, use that path; otherwise contact the owner directly.
