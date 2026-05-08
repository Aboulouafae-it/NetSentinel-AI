# NetSentinel AI Deployment Hardening

This checklist is for production-style local appliance deployments.

## Required Configuration

- Set `ENVIRONMENT=production` and `DEBUG=false`.
- Generate a unique `SECRET_KEY` with `openssl rand -hex 48`.
- Restrict `CORS_ORIGINS` to the appliance HTTPS origin.
- Do not use development `EDGE_AGENT_TOKENS`.
- Keep `.env.production` readable only by the deployment user/root.

## Network Exposure

- Do not expose PostgreSQL or Redis publicly.
- Bind backend/frontend to loopback when using a reverse proxy.
- Terminate HTTPS with nginx, Caddy, Traefik, or an appliance-managed proxy.
- Restrict management access to trusted operator networks.

## Credentials and Tokens

- Rotate Edge Agent tokens after provisioning or suspected exposure.
- Revoke retired agents immediately.
- Treat SSE query tokens as sensitive until short-lived stream tokens are added.
- Do not paste secrets into notes, logs, activity metadata, or tickets.
- Treat credential profiles as appliance secrets. Prefer read-only SNMP,
  RouterOS, and API credentials.
- Do not bake `.env.production`, credentials, or tokens into live images.

## Backups

- Enable `netsentinel-backup.timer`.
- Store backup archives off-appliance.
- Test restore on a non-production appliance before relying on backups.
- Protect backup archives because they contain database contents and config.
- Do not publish backup archives, database dumps, or generated reports without
  review and redaction.

## Operations

- Use `/api/v1/system/health` or the Appliance page to check services.
- Watch disk usage and backup freshness.
- Keep OS, Docker, PostgreSQL, Redis, and NetSentinel images updated.
- Review audit/activity events during incident response.

## Rate Limiting and Ingestion

- Keep rate limiting enabled.
- Require authenticated telemetry, syslog, and agent heartbeat ingestion.
- Put public-facing appliances behind a reverse proxy with request limits.

## Real Device Captures

- Raw captures must never be committed.
- Redact public/private IPs where appropriate, MACs, serials, usernames, emails,
  SNMP communities, tokens, API keys, hostnames, and customer names.
- Store reviewed captures only under `real_redacted/` fixture paths with
  metadata.
- See `docs/REAL_DEVICE_CAPTURE_GUIDE.md`.
