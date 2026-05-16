# NetSentinel AI OS Persistence and Install Mode Design

**Version:** v2.5 Planning
**Status:** Design Specification

---

## 1. Operating Modes

NetSentinel AI OS supports three operating modes, each with a distinct persistence model.

### Mode 1: Live Demo Mode (Current)

**Description:** Boots from ISO or USB. No data written to host disk. All session
data is in RAM. Data is lost on shutdown.

| Aspect | Behavior |
|---|---|
| Storage | RAM (tmpfs overlayfs) |
| NetSentinel config | Not persisted |
| Docker volumes | Lost at shutdown |
| Logs | Lost at shutdown (unless written to external mount) |
| Backups | Not applicable |
| Hostname | `netsentinel-ai` (via live-config) |
| Credentials | None baked in; first-run setup required each boot |
| Use case | Field demo, training, evaluation |

**What persists:** Nothing survives reboot.

**What does not persist:** All configuration, all data, all Docker volumes.

**Safety rules:**

- Do not use Live Demo Mode for any production or customer data
- Do not assume data survives reboot
- Always document the "data will be lost" behavior in any demo context

---

### Mode 2: Installed Appliance Mode

**Description:** NetSentinel AI OS is installed to disk (HDD/SSD). All data
is written to persistent storage. Reboots safely.

| Aspect | Behavior |
|---|---|
| Storage | Local disk (HDD/SSD), host filesystem |
| NetSentinel config | Persisted at `/opt/netsentinel/config/` |
| Docker volumes | Persisted (named volumes in Docker's storage) |
| Logs | Persisted at `/var/log/netsentinel/` |
| Backups | Written to `/opt/netsentinel/backups/` |
| Hostname | `netsentinel-ai` (via `/etc/hostname`) |
| Credentials | Operator-generated on first run; stored in `/opt/netsentinel/` |
| Use case | Production-like appliance, NOC/SOC deployment, field appliance |

**What persists:**

- PostgreSQL data (Docker volume `netsentinel_db_data`)
- Redis data (Docker volume `netsentinel_redis_data`)
- NetSentinel config files (`/opt/netsentinel/config/`)
- `.env.production` (operator-generated, not ISO-baked)
- Backups (`/opt/netsentinel/backups/`)
- Reports (`/opt/netsentinel/reports/`)
- First-boot log (`/var/log/netsentinel/first-boot.log`)
- System logs (`/var/log/netsentinel/`)

**What does not persist (across re-image):**

- Live ISO overlay changes
- Manually installed ad-hoc packages (use `package-lists/` to make permanent)
- Temporary capture files written to `/tmp/`

**Safety rules:**

- Back up `/opt/netsentinel/backups/` before any update
- Never commit `.env.production` to version control
- Run `appliance-status` after every reboot to verify service health

---

### Mode 3: Persistent USB Mode (Future)

**Description:** Boots from a specially prepared USB drive that includes a persistence
partition. Data written to the persistence partition survives reboots.

| Aspect | Behavior |
|---|---|
| Storage | USB drive, persistence partition (e.g., `casper-rw` or `persistence`) |
| NetSentinel config | Persisted on USB persistence partition |
| Docker volumes | Persisted if overlaid onto persistence partition |
| Logs | Persisted on persistence partition |
| Backups | Written to persistence partition or external mount |
| Hostname | Persisted on persistence partition |
| Credentials | Operator-generated; persisted |
| Use case | Field technician USB; portable appliance |

**Status:** Not yet implemented. Requires:

- `live-build` persistence partition configuration
- Boot parameter: `persistence`
- Persistence partition format: `ext4` labeled `persistence` with `/persistence.conf`
- Docker volume persistence strategy (bind-mount or overlay path)

**Safety rules for future implementation:**

- Persistence partition must be encrypted (LUKS) for field use
- Never use persistent USB mode without full-disk encryption active
- Treat a found/stolen persistent USB as a data breach event

---

## 2. Key Paths and Their Role

| Path | Mode | Purpose |
|---|---|---|
| `/opt/netsentinel/` | Installed / Persistent USB | App deployment root |
| `/opt/netsentinel/config/` | Installed / Persistent USB | Runtime config, cloud credentials, TLS certs |
| `/opt/netsentinel/backups/` | Installed / Persistent USB | Backup archives |
| `/opt/netsentinel/reports/` | Installed / Persistent USB | Generated diagnostic reports |
| `/opt/netsentinel/captures/` | Installed / Persistent USB | Operator-initiated packet captures |
| `/var/lib/netsentinel/` | Installed / Persistent USB | Persistent state data |
| `/var/log/netsentinel/` | Installed / Persistent USB | NetSentinel-specific log files |
| `/var/log/netsentinel/first-boot.log` | Installed / Persistent USB | First-boot script output |
| Docker volume: `netsentinel_db_data` | Installed / Persistent USB | PostgreSQL data |
| Docker volume: `netsentinel_redis_data` | Installed / Persistent USB | Redis data |
| `/tmp/` | All modes | Temporary captures (not persisted) |

---

## 3. Backup and Restore Expectations

### 3.1 What is Backed Up

The backup script (`scripts/backup.sh`) targets:

- PostgreSQL database dump (via `pg_dump` inside the container)
- `/opt/netsentinel/config/` (minus raw credentials if paranoid mode is active)
- `.env.production` (if present; note: this contains secrets)
- Redis dump (optional; configurable)

### 3.2 Backup Location

Default: `/opt/netsentinel/backups/netsentinel-backup-<timestamp>.tar.gz`

Backups should be:

- Rotated (keep last N backups; configurable)
- Copied to an external location (NFS, S3, SFTP — operator responsibility)
- Never committed to version control

### 3.3 Restore Expectations

The restore script (`scripts/restore.sh`) will:

1. Verify archive integrity
2. Stop running services
3. Restore database from `pg_dump` archive
4. Restore config files
5. Restart services
6. Verify health via `appliance-status`

The v3.10 Reports & Export Center may display backup metadata from the appliance
health API, but it intentionally does not expose a restore button. Restore remains
a deliberate operator-controlled command-line action until RBAC, audit logging,
pre-restore validation, backup integrity checks, and rollback guidance are
implemented in the backend.

### 3.4 Backup Security

- Backup archives may contain `SECRET_KEY`, `POSTGRES_PASSWORD`, and Edge Agent tokens
- Archives must be protected with file permissions (`chmod 600`)
- Future: backup encryption (GPG or AES) before offsite transfer
- Reports and support exports must not include backup archives, database dumps,
  `.env` files, or raw captures unless an explicit secure support-bundle workflow exists.

---

## 4. Docker Volume Strategy

### 4.1 Named Volume Persistence (Installed Mode)

Docker named volumes are managed by Docker's storage driver.

| Volume | Contents |
|---|---|
| `netsentinel_db_data` | PostgreSQL data files |
| `netsentinel_redis_data` | Redis persistence (AOF/RDB) |

To inspect: `docker volume inspect netsentinel_db_data`

To back up: Accessed via `pg_dump` inside the `db` container.

### 4.2 Live Mode (No Persistence)

In Live Demo Mode, Docker volumes are stored in the RAM overlay filesystem. They are
lost on shutdown. This is expected and documented behavior.

### 4.3 Persistent USB Mode (Future)

Docker volumes must be redirected to the persistence partition. This requires either:

- Docker's `--data-root` set to a path on the persistence partition
- Or bind mounts from persistence partition paths into containers

---

## 5. Reboot Validation Plan

After any reboot of an Installed Appliance, the operator should verify:

```bash
appliance-status
```

Expected healthy output:

- Hostname: `netsentinel-ai`
- Docker services: running
- Backend API: healthy
- Frontend: reachable
- Console URL: printed
- First-boot log: present (or note explaining it ran previously)

Automated reboot validation via `netsentinel-first-boot.service` (oneshot systemd unit):

- Runs once at boot
- Checks Docker/compose status
- Writes to `/var/log/netsentinel/first-boot.log`
- Does not overwrite `.env` without backup
- Does not log secrets
- Safe to re-run idempotently

---

## 6. ISO Forbidden Payload Rules

The following must **never** appear in the built ISO or `includes.chroot/`:

| Forbidden | Reason |
|---|---|
| `.env` or `.env.production` | Contains real secrets |
| `*.pem`, `*.key`, `*.crt` (real certs) | Private key exposure |
| `*.token`, `*.secret` | Credential exposure |
| PostgreSQL dump files | Customer data |
| Raw packet captures | Privacy / customer data |
| Backup archives | Contains secrets and data |
| Cloud API keys or credentials | Credential exposure |
| Real customer or organization data | Privacy |

The `build-live-prototype.sh` script performs a scan for forbidden patterns before building.
