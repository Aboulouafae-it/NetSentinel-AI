# NetSentinel AI OS Appliance Hardening Plan

**Version:** v2.5 Planning
**Status:** Security Design Specification

> This document defines the security hardening posture for the NetSentinel AI OS appliance.
> Not all items are fully implemented in the current Public Alpha.
> Items marked **Implemented** are in the current codebase.
> Items marked **Planned** are design commitments for future milestones.
> Items marked **Required before field use** must be completed before any production deployment.

---

## 1. Firewall Strategy

### 1.1 Default Firewall Posture

Default (on installed appliance):

| Port | Service | Default Policy |
|---|---|---|
| 22 (SSH) | SSH | Closed by default; operator-enabled |
| 80 (HTTP) | Frontend reverse proxy | Open on LAN only |
| 443 (HTTPS) | Frontend reverse proxy | Open on LAN only (if TLS configured) |
| 3000 | Next.js dev server (direct) | LAN-only; not exposed publicly |
| 8000 | FastAPI backend (direct) | LAN-only; not exposed publicly |
| 5432 | PostgreSQL | Localhost-only (Docker internal) |
| 6379 | Redis | Localhost-only (Docker internal) |
| 5514 | Syslog UDP listener | LAN-only |
| 161/162 | SNMP | Outbound polling only; no inbound SNMP server |

### 1.2 Firewall Tool

Recommended: `ufw` (Uncomplicated Firewall) or `nftables`.

MVP rule set:

```bash
# Default deny inbound
ufw default deny incoming
ufw default allow outgoing

# Allow management console (LAN only; restrict to subnet if possible)
ufw allow from 192.168.0.0/16 to any port 3000 proto tcp
ufw allow from 10.0.0.0/8 to any port 3000 proto tcp
ufw allow from 172.16.0.0/12 to any port 3000 proto tcp

# Syslog receiver
ufw allow from 192.168.0.0/16 to any port 5514 proto udp
ufw allow from 10.0.0.0/8 to any port 5514 proto udp

# Enable
ufw enable
```

Do not open port 3000 or 8000 to `0.0.0.0/0` (internet). Use a reverse proxy with TLS
and restrict to the management LAN.

### 1.3 Status

**Planned** — firewall setup is not yet automated by the installer.
**Required before field use** — operator must configure firewall before production deployment.

---

## 2. SSH Policy

### 2.1 Default State

SSH is **disabled by default** on the Live ISO.

### 2.2 If SSH is Enabled

Mandatory settings in `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers netsentinel-admin
MaxAuthTries 3
LoginGraceTime 30
```

- Root SSH is always denied
- Password authentication is always disabled; SSH key required
- Only authorized operators have SSH access
- SSH access should be restricted to a management VLAN or jumphost

### 2.3 SSH Key Management

- SSH public keys for authorized operators are added to `/home/<user>/.ssh/authorized_keys`
- No pre-installed operator SSH keys in the ISO
- Key provisioning is an operator responsibility

### 2.4 Status

**Planned** — SSH hardening config is not yet automated.
**Required before field use** — SSH hardening must be applied before enabling SSH.

---

## 3. No Default Passwords

### 3.1 NetSentinel Application

- No default admin password
- First-run setup is required before any login is possible
- Password strength policy enforced in the API

### 3.2 PostgreSQL

- `POSTGRES_PASSWORD` generated randomly at first run (not baked into ISO)
- Stored in `.env.production` (operator-generated)
- PostgreSQL not accessible from outside localhost

### 3.3 Redis

- Redis `AUTH` password generated randomly at first run (if configured)
- Redis not accessible from outside localhost

### 3.4 OS Users

- No pre-set passwords for system users (live user auto-login is a live-mode-only feature)
- In installed appliance mode, operator creates their own user account
- Root login is disabled by default

### 3.5 Status

**Implemented (application level).** Installer generates secrets.
**Planned (OS level).** Live auto-login is acceptable for demo mode only.

---

## 4. First-Run Setup Required

The appliance enforces a setup gate:

- Setup URL: `http://localhost:3000/setup`
- Without completing first-run setup, the dashboard returns 404 or redirect-to-setup
- First organization and admin user creation is required
- Subsequent users are created by the admin

### 4.1 First-Run Checks

`netsentinel-first-boot.service` (oneshot systemd unit) verifies:

- Docker is available
- `.env.production` exists (or prompts for generation)
- Compose stack is up (or starts it)
- Logs status to `/var/log/netsentinel/first-boot.log`

No secrets are logged. The log contains only status messages.

---

## 5. Local-Only PostgreSQL and Redis

### 5.1 Network Binding

Both services bind to Docker's internal bridge network only:

- No `host` mode networking for PostgreSQL or Redis
- No external port mappings in `docker-compose.prod.yml` for database or cache
- Accessible only to other Docker services in the same compose network

### 5.2 Audit Check

After deploy, verify:

```bash
ss -tlnp | grep 5432   # should not appear on 0.0.0.0
ss -tlnp | grep 6379   # should not appear on 0.0.0.0
```

If either appears on `0.0.0.0`, review the compose config immediately.

### 5.3 Status

**Implemented** in the current `docker-compose.prod.yml`.

---

## 6. Docker Hardening

### 6.1 Implemented

- Docker runs as root (required for live-build and Docker socket control)
- Compose services run as non-root users inside containers (future: verify per-service)

### 6.2 Planned

| Item | Status |
|---|---|
| No privileged containers | Planned |
| `no-new-privileges` security option | Planned |
| Read-only container root filesystem where possible | Planned |
| Docker socket access restricted to compose use only | Planned |
| Container resource limits (CPU / memory) | Planned |
| Docker content trust (signed images) | Future |
| Distroless or minimal base images | Future |

### 6.3 Docker Daemon Hardening (`/etc/docker/daemon.json`)

Planned configuration:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "no-new-privileges": true,
  "icc": false,
  "live-restore": true
}
```

---

## 7. Secret Generation

### 7.1 Generated at First Run

| Secret | Generator |
|---|---|
| `SECRET_KEY` (application) | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `REDIS_PASSWORD` (if configured) | `openssl rand -hex 24` |
| Edge Agent tokens | Application API (UUID + signing) |

### 7.2 Rules

- Never bake secrets into the ISO
- Never hardcode secrets in source code
- Never log secrets (first-boot, appliance-status, CI output)
- Store secrets only in `.env.production` with `chmod 600`
- Back up `.env.production` with the database backup (encrypted)

### 7.3 Status

**Implemented** in the installer script.
**Required before field use** — operator must run first-run setup to generate production secrets.

---

## 8. Backup Security

| Control | Status |
|---|---|
| Backup archives contain database (may include PII) | Known; document clearly |
| Backup archives contain `.env.production` (contains secrets) | Known; restrict file permissions |
| Backup archive permissions: `chmod 600` | Planned |
| Backup encryption (GPG / AES) before offsite transfer | Future |
| Backup rotation (keep last N) | Implemented (configurable) |
| Backup destination (local only) | Implemented |
| Offsite backup transfer (NFS, S3, SFTP) | Future; operator responsibility |

---

## 9. Update Safety

### 9.1 Update Workflow

```bash
sudo /opt/netsentinel/deploy/update-netsentinel.sh
```

The update script must:

- Back up the database before updating
- Back up `.env.production` before updating
- Never overwrite `.env.production` without a backup
- Verify service health after update
- Provide rollback instructions if the update fails

### 9.2 Package Updates

- OS packages: `sudo apt-get update && sudo apt-get upgrade`
- Docker images: `docker compose pull && docker compose up -d`
- Do not auto-update in production without a maintenance window

### 9.3 Status

**Implemented (script exists).** Update script backup behavior needs audit.
**Required before field use** — test update → rollback path in a VM before field deployment.

---

## 10. Log Protection

### 10.1 Log Locations

| Path | Content | Protection |
|---|---|---|
| `/var/log/netsentinel/` | NetSentinel logs | `chmod 750`, owner `netsentinel` or `root` |
| `/var/log/netsentinel/first-boot.log` | First-boot status | `chmod 640` |
| Docker container logs | Application output | Via Docker log driver |
| `journalctl` | System journal | Standard systemd permissions |

### 10.2 Log Rotation

- System logs: managed by `logrotate`
- Docker logs: managed by Docker's `json-file` log driver with `max-size` and `max-file`
- NetSentinel application logs: rotation planned via logrotate config

### 10.3 Log Sensitivity

Logs must not contain:

- Plaintext passwords or secrets
- Raw packet capture data
- Customer PII beyond what is operationally necessary
- Cloud API keys or tokens

### 10.4 Status

**Partially implemented.** Log rotation config needs formal setup.

---

## 11. ISO Forbidden Payload Rules

The `build-live-prototype.sh` script enforces the following scan before building:

| Pattern | Blocked |
|---|---|
| `.env` | Yes |
| `.env.production` | Yes |
| `*.pem`, `*.key` | Yes |
| `*.token`, `*.secret` | Yes |
| `*.dump`, `*.sql` | Yes |
| `*.sqlite`, `*.db` | Yes |
| `*raw*`, `*capture*` | Yes |
| Regex: `SECRET_KEY=`, `POSTGRES_PASSWORD=`, `BEGIN.*PRIVATE KEY`, `TOKEN=`, `PASSWORD=` | Yes |

Any match fails the build immediately with a clear error message.

---

## 12. Hardening Checklist (Before Field Use)

| Item | Status |
|---|---|
| Firewall configured and enabled | Operator responsibility |
| SSH disabled or key-only enabled | Operator responsibility |
| Default passwords not set | Implemented (first-run required) |
| `.env.production` generated with strong secrets | Operator responsibility |
| PostgreSQL not accessible externally | Implemented |
| Redis not accessible externally | Implemented |
| Backup configured and tested | Operator responsibility |
| Update path tested | Operator responsibility |
| Log protection configured | Partially implemented |
| SSH keys provisioned (if SSH enabled) | Operator responsibility |
| TLS configured on reverse proxy (if public access) | Operator responsibility |
| ISO does not contain secrets or captures | Implemented (build scan) |
