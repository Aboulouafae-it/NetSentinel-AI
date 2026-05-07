# NetSentinel AI Appliance Install Prototype

v1.0 provides a Debian/Ubuntu-style appliance installer prototype. It does not
build a full ISO yet.

## Directory Layout

- `/opt/netsentinel` - application and deployment files
- `/opt/netsentinel/backups` - backup archives
- `/opt/netsentinel/reports` - generated reports
- `/opt/netsentinel/logs` - appliance-local app logs
- `/var/lib/netsentinel` - persistent appliance data
- `/var/log/netsentinel` - host-level logs

## Fresh Install

From a checked-out release directory:

```bash
sudo deploy/install-netsentinel.sh
```

The installer:

- checks for Debian/Ubuntu-like systems
- requires Docker and the Docker Compose plugin
- creates appliance directories
- generates `.env.production` with a secure `SECRET_KEY`
- installs systemd units
- builds and starts containers
- runs `alembic upgrade head`

After install, open:

```text
http://localhost:3000/setup
```

## Update

From a newer release directory:

```bash
sudo deploy/update-netsentinel.sh
```

The update script creates a backup, copies new files, rebuilds containers, runs
migrations, restarts services, and verifies `/health`.

## Uninstall

Preserve data:

```bash
sudo deploy/uninstall-netsentinel.sh
```

Remove data intentionally:

```bash
sudo deploy/uninstall-netsentinel.sh --purge
```

`--purge` waits before deletion and removes `/opt/netsentinel`,
`/var/lib/netsentinel`, and `/var/log/netsentinel`.

## Backup

```bash
sudo /opt/netsentinel/scripts/backup.sh
```

Backups include PostgreSQL, `.env.production`, storage, reports, logs, data, and
metadata when present.

## Restore

```bash
sudo /opt/netsentinel/scripts/restore.sh /opt/netsentinel/backups/netsentinel-backup-YYYYMMDDTHHMMSSZ.tar.gz --yes
```

Restore replaces the current PostgreSQL schema. Test on a staging appliance
before relying on it in production.

## Services

```bash
sudo systemctl status netsentinel-compose.service
sudo systemctl restart netsentinel-compose.service
sudo systemctl status netsentinel-backup.timer
```

## Logs

```bash
sudo docker compose --env-file /opt/netsentinel/.env.production -f /opt/netsentinel/docker-compose.prod.yml logs -f backend
journalctl -u netsentinel-compose.service -f
```

## Health Checks

- Backend: `http://localhost:8000/health`
- Appliance API: `GET /api/v1/system/health`
- Version API: `GET /api/v1/system/version`
- UI: `http://localhost:3000/admin/appliance`

## Ports

Default production compose binds:

- Backend: `127.0.0.1:8000`
- Frontend: `127.0.0.1:3000`

PostgreSQL and Redis are internal Docker services only.

## Reverse Proxy

Examples are provided:

- `deploy/reverse-proxy/nginx.conf.example`
- `deploy/reverse-proxy/Caddyfile.example`

Use HTTPS before exposing beyond a trusted local operator network.

## Troubleshooting

- Check `.env.production` for `SECRET_KEY`, `CORS_ORIGINS`, and
  `NEXT_PUBLIC_API_URL`.
- Run `docker compose ps`.
- Run `alembic upgrade head` inside the backend container.
- Check disk usage on `/opt/netsentinel/backups`.
- Use `/admin/appliance` for service status and version metadata.
