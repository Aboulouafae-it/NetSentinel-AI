# Security Policy

NetSentinel AI is a work-in-progress security and network operations platform. Please do not treat the current repository as production-hardened software.

## Supported Versions

| Version | Status |
|---------|--------|
| 0.1.x | Local MVP / active development |

## Reporting A Vulnerability

If you find a security issue, please open a private report or contact the repository owner directly instead of publishing exploit details in a public issue.

When reporting, include:

- affected component,
- reproduction steps,
- expected impact,
- logs or screenshots when useful,
- suggested mitigation if known.

## Local Deployment Notes

- Change `SECRET_KEY` before any non-local use.
- Change default database credentials before exposing services.
- Keep `.env` private. Only `.env.example` should be committed.
- Do not expose PostgreSQL, Redis, or the FastAPI service publicly without a reverse proxy, TLS, authentication hardening, and firewall rules.
- Review dependencies regularly before production deployment.
