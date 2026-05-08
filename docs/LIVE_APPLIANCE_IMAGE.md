# NetSentinel AI Debian Live Appliance Prototype

v1.8 introduces the first Debian-based live/appliance image structure. This is
not a final production ISO. It is a reproducible scaffold for later live-build,
USB persistence, and installer testing.

## Recommended Base

Use Debian Stable minimal, currently Debian 12 Bookworm style tooling.

Debian is used because it is stable, widely supported on server and appliance
hardware, has mature systemd/Docker packaging, and supports live-build workflows
without proprietary tooling.

## Appliance Modes

- Installed appliance: NetSentinel is installed to disk with persistent
  `/opt/netsentinel`, `/var/lib/netsentinel`, Docker volumes, backups, and logs.
- Live USB demo: boots into a temporary environment. Data is lost at shutdown.
- Live USB with persistence: future mode using a dedicated persistence partition
  for `/opt/netsentinel`, `/var/lib/netsentinel`, logs, and Docker volumes.
- Future ISO image: a signed/release artifact produced from the live-image
  scaffold after repeated VM and hardware tests.

## Hardware Requirements

Prototype minimum:

- x86_64 CPU
- 4 CPU cores recommended
- 8 GB RAM minimum, 16 GB recommended
- 64 GB storage for installed appliance
- 2 network interfaces recommended for monitoring deployments

## Network Requirements

- Local operator access to `http://localhost:3000/setup`
- Management network access to monitored devices
- DNS and NTP/chrony working
- Optional outbound package registry access during install/build
- Do not expose PostgreSQL or Redis publicly

## Storage And Persistence

Prototype paths:

- `/opt/netsentinel` - app/deployment files
- `/opt/netsentinel/backups` - backup archives
- `/opt/netsentinel/reports` - generated reports
- `/var/lib/netsentinel` - persistent appliance data
- `/var/log/netsentinel` - host-level logs
- PostgreSQL and Redis Docker volumes from `docker-compose.prod.yml`

Live demo without persistence loses data on shutdown. Installed appliance keeps
data. Future persistent USB mode needs a dedicated persistence partition.

## Package Set

Required:

- `systemd`
- `docker.io`
- `docker-compose-plugin`
- `git`
- `curl`
- `jq`
- `ca-certificates`
- `openssl`
- `network-manager`
- `nmap`
- `fping`
- `arp-scan`
- `snmp`
- `tcpdump`
- `iperf3`
- `mtr`
- `traceroute`
- `dnsutils`
- `whois`
- `ethtool`
- `lldpd`
- `rsyslog`
- `chrony`

Optional:

- `nginx` or a Caddy reverse proxy
- `tshark`
- `snmp-mibs-downloader` where repository policy allows it

## First Boot Flow

Prototype first boot:

1. Check Docker availability.
2. Verify `/opt/netsentinel` contains a release payload.
3. Run `deploy/install-netsentinel.sh` if `.env.production` does not exist.
4. Start Docker/systemd services.
5. Start the compose stack.
6. Print appliance status.
7. Show setup URL: `http://localhost:3000/setup`.

Desktop builds can use a launcher/kiosk entry. Server-only builds show MOTD and
console status with `netsentinel-appliance-status`.

## Security Checklist

- Default passwords disabled.
- First-run setup required.
- SSH disabled by default or explicitly documented before enabling.
- Firewall policy reviewed before deployment.
- PostgreSQL and Redis bound internally only.
- Strong `SECRET_KEY` generated on install/first boot.
- Backup timer configured.
- Edge Agent tokens rotated after staging.
- No secrets baked into ISO.
- No real `.env.production` baked into ISO.
- No customer captures or raw logs included.

## Update Strategy

Use the existing update script for installed appliances:

```bash
sudo /opt/netsentinel/deploy/update-netsentinel.sh
```

Live USB demo mode should be rebuilt from source rather than updated in place.
Persistent USB mode will need a separate update policy once implemented.

## Build Environment

Recommended build OS: Debian Stable in a clean VM.

Build host recommendations:

- 4 CPU cores
- 8 GB RAM minimum
- 40 GB free disk for package cache and ISO artifacts
- outbound apt repository access

Install tooling:

```bash
sudo apt-get update
sudo apt-get install -y live-build ca-certificates curl git
```

Clean up artifacts:

```bash
cd deploy/live-image
sudo ./build-live-prototype.sh --clean
```

`--clean` prompts before invoking `lb clean`.

## Release Payload Strategy

Option A: bootstrap-only image.

- Pros: no secrets, smaller image, easier update path, image can install the
  current release at first boot.
- Cons: first boot needs a release payload or network access.

Option B: include release payload under `/opt/netsentinel`.

- Pros: can work offline after boot, faster demo setup.
- Cons: larger image, easier to accidentally bake stale files, needs stronger
  review to avoid `.env`, databases, captures, or secrets.

v1.9 uses the safe prototype approach: installer/bootstrap files and examples
only. Do not include `.env.production`, live databases, backups, tokens, or
customer captures in the image.

## Prototype Build

```bash
cd deploy/live-image
./build-live-prototype.sh --check-only
```

If live-build is installed:

```bash
sudo ./build-live-prototype.sh --build
```

Expected artifact path:

```text
deploy/live-image/live-image-amd64.hybrid.iso
```

The current scaffold validates structure and can become a real ISO workflow
after VM boot tests, persistence testing, and security review.

See `docs/LIVE_IMAGE_VM_TEST_PLAN.md` for QEMU, VirtualBox, and VMware checks.

## v2.1 Validation Status

- Clean VM installer test: pending in the current environment. See
  `docs/CLEAN_VM_INSTALL_TEST.md`.
- Real ISO build: pending in the current environment because `live-build` is not
  installed. See `docs/REAL_ISO_BUILD_TEST.md`.
- ISO VM boot test: pending in the current environment because no ISO artifact
  exists locally and QEMU is not installed. See `docs/ISO_VM_BOOT_TEST.md`.
