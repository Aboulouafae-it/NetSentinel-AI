# NetSentinel AI Clean VM Installer Test

This document describes the clean VM installer validation path for NetSentinel
AI. It is intended for Debian Stable or Ubuntu LTS. Do not run destructive
installer/uninstaller tests on a workstation with important local appliance
data.

## Current v2.1 Status

Status: **Pending in this environment**.

The current development host does not expose a clean nested VM. The full
installer flow should be run in a fresh Debian/Ubuntu VM before claiming the
installer is field-tested.

## VM Requirements

Recommended:

- Debian Stable or Ubuntu LTS, minimal/server install
- 4 vCPUs
- 8 GB RAM minimum
- 40-64 GB disk
- NAT networking for basic validation
- Bridged networking only if testing LAN device polling
- Internet access for apt and Docker image/package downloads

## Prepare The VM

Install the OS, log in as a sudo-capable user, then install bootstrap tools:

```bash
sudo apt-get update
sudo apt-get install -y git curl ca-certificates
```

Clone the repository:

```bash
git clone https://github.com/Aboulouafae-it/NetSentinel-AI.git "NetSentinel AI"
cd "NetSentinel AI"
```

## Run The Installer

```bash
sudo deploy/install-netsentinel.sh
```

Expected behavior:

- Installer requires root/sudo.
- Installer detects Debian/Ubuntu-like OS.
- Installer refuses to continue if Docker/Compose is missing and prints install
  guidance.
- Installer creates `/opt/netsentinel`, `/var/lib/netsentinel`, and
  `/var/log/netsentinel`.
- Installer creates `/opt/netsentinel/.env.production` without overwriting an
  existing file unless a timestamped backup is created.
- Installer starts the Docker Compose stack.
- Installer runs `alembic upgrade head`.
- Installer prints the setup URL.

## First-Run Setup

Open:

```text
http://localhost:3000/setup
```

If accessing from the host machine, find the VM IP:

```bash
ip addr
```

Then open:

```text
http://<vm-ip>:3000/setup
```

Create the first organization and admin user. Use a validator-compatible local
demo address such as:

```text
admin@netsentinel.local
```

Then log in and confirm:

- Dashboard loads.
- Appliance Status page loads.
- Backend health is visible.
- Frontend is reachable.

## Backup Dry Run

Run:

```bash
sudo NETSENTINEL_ROOT=/opt/netsentinel /opt/netsentinel/scripts/backup.sh --dry-run
```

Expected behavior:

- Script prints planned backup path.
- Script does not write a backup archive in dry-run mode.
- Script reports reports/logs/data paths.

## Update Script Safe Path

The current update script does not have a dedicated `--dry-run` mode. For alpha
validation, run only after a successful backup or on a disposable VM:

```bash
sudo /opt/netsentinel/deploy/update-netsentinel.sh
```

Expected behavior:

- Pre-update backup is created.
- Application files are copied while preserving `.env.production`.
- Containers rebuild/restart.
- Migrations run.
- Backend health check passes.

## Uninstall Without Purge

Run:

```bash
sudo /opt/netsentinel/deploy/uninstall-netsentinel.sh
```

Expected behavior:

- systemd services are disabled/stopped.
- Docker Compose stack is stopped.
- `/opt/netsentinel`, `/var/lib/netsentinel`, and `/var/log/netsentinel` remain.
- No data is removed without explicit `--purge`.

Confirm preserved data:

```bash
sudo test -d /opt/netsentinel
sudo test -d /var/lib/netsentinel
sudo test -d /var/log/netsentinel
```

Do not run `--purge` unless the VM is disposable and you intend to destroy local
appliance data.

## Logs To Collect On Failure

```bash
sudo journalctl -u netsentinel-compose.service --no-pager -n 200
sudo docker compose --env-file /opt/netsentinel/.env.production -f /opt/netsentinel/docker-compose.prod.yml ps
sudo docker compose --env-file /opt/netsentinel/.env.production -f /opt/netsentinel/docker-compose.prod.yml logs --tail=200 backend frontend postgres redis worker
sudo tail -n 200 /var/log/netsentinel/*.log 2>/dev/null || true
```

## Result Template

```text
OS:
VM CPU/RAM/disk:
Repository commit:
Installer result: Passed / Failed
Setup result: Passed / Failed
Login result: Passed / Failed
Dashboard result: Passed / Failed
Appliance status result: Passed / Failed
Backup dry-run result: Passed / Failed
Update script result: Passed / Failed / Not run
Uninstall without purge result: Passed / Failed / Not run
Data preserved after uninstall: Passed / Failed / Not run
Notes:
```
