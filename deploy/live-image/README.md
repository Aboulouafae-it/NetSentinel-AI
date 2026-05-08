# NetSentinel AI Debian Live Appliance Prototype

This directory is a prototype live-build style scaffold. It is intentionally
small and conservative: it documents the future ISO path and validates the
required files without pretending to be a finished distribution.

The existing installer remains the source of truth:

- `deploy/install-netsentinel.sh`
- `docker-compose.prod.yml`
- `deploy/systemd/`
- `scripts/backup.sh`
- `scripts/restore.sh`

## Prototype Layout

- `auto/config` - live-build configuration skeleton
- `package-lists/netsentinel.list.chroot` - required and useful appliance packages
- `includes.chroot/` - prototype files copied into the live filesystem
- `hooks/normal/` - post-install customization hooks
- `scripts/first-boot.sh` - first boot orchestration prototype
- `scripts/appliance-status.sh` - local appliance status helper
- `build-live-prototype.sh` - safe build wrapper

## Safety

No secrets, `.env.production`, customer captures, database dumps, or private
keys belong in this image tree. First boot or install must generate secrets on
the target system.

## Debian VM Build Workflow

Recommended build OS: Debian Stable.

Build host requirements:

- 4 CPU cores
- 8 GB RAM minimum
- 40 GB free disk
- outbound apt access

Install build tooling:

```bash
sudo apt-get update
sudo apt-get install -y live-build ca-certificates curl git
```

## Prototype Build

```bash
cd deploy/live-image
./build-live-prototype.sh --check-only
```

If `live-build` is installed and you intentionally want to try a local build:

```bash
sudo ./build-live-prototype.sh --build
```

Expected output:

```text
deploy/live-image/live-image-amd64.hybrid.iso
```

Clean build artifacts:

```bash
sudo ./build-live-prototype.sh --clean
```

The build path is still experimental. Prefer testing the installer on a Debian
VM before producing bootable media.

## Payload Strategy

The v1.9 prototype uses a bootstrap-only approach. It includes live-image
helpers, documentation, and installer references, but it must not include real
`.env.production`, customer data, backups, databases, private keys, tokens, or
raw captures.
