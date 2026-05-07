# NetSentinel AI Appliance Deployment

## Production-style local startup

1. Copy `.env.production.example` to `.env.production`.
2. Replace every `change-me` value.
3. Set `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` for your appliance hostname.
4. Start the stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

PostgreSQL and Redis are internal-only in `docker-compose.prod.yml`; expose the
frontend/backend through a local reverse proxy.

## Debian systemd install

```bash
sudo mkdir -p /opt/netsentinel
sudo rsync -a ./ /opt/netsentinel/
sudo cp /opt/netsentinel/deploy/systemd/netsentinel-compose.service /etc/systemd/system/
sudo cp /opt/netsentinel/deploy/systemd/netsentinel-backup.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now netsentinel-compose.service
sudo systemctl enable --now netsentinel-backup.timer
```

## Backup and restore

```bash
scripts/backup.sh
scripts/restore.sh /opt/netsentinel/backups/netsentinel-backup-YYYYMMDDTHHMMSSZ.tar.gz --yes
```

Run restore only after confirming the target database can be replaced.
