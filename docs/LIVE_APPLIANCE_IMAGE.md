# NetSentinel AI OS Live Appliance Prototype

v2.9 validates the NetSentinel AI OS branding layer over the existing
Debian-based live/appliance image structure. This is not a final production ISO.
It is a reproducible scaffold for later live-build, USB persistence, and
installer testing.

## User-Facing Identity

- OS name: NetSentinel AI OS
- Live edition: NetSentinel AI Live Appliance
- Console: NetSentinel AI Console
- ISO label: `NETSENTINEL_AI`
- Default hostname: `netsentinel-ai`

The user-facing experience should present NetSentinel AI OS, not a generic
distribution desktop with an app installed.

## Recommended Base

Use Debian Stable minimal, currently Debian 12 Bookworm style tooling, as the
technical base for packages, drivers, and security updates.

Debian is used internally because it is stable, widely supported on server and
appliance hardware, has mature systemd/Docker packaging, and supports live-build
workflows without proprietary tooling. Debian branding is not used as the
product identity.

## Appliance Modes

- Installed appliance: NetSentinel is installed to disk with persistent
  `/opt/netsentinel`, `/var/lib/netsentinel`, Docker volumes, backups, and logs.
- Live USB demo: boots into a temporary environment. Data is lost at shutdown.
- Live USB with persistence: future mode using a dedicated persistence partition
  for `/opt/netsentinel`, `/var/lib/netsentinel`, logs, and Docker volumes.
- Future ISO image: a signed/release artifact produced from the live-image
  scaffold after repeated VM and hardware tests.

## Specialized OS Positioning

NetSentinel AI OS is a specialized operating system direction for:

- network discovery,
- ICMP/SNMP monitoring,
- syslog and security event analysis,
- Fortinet firewall syslog profiling,
- outdoor WiFi/radio diagnostics,
- MikroTik, TP-Link CPE, and Ubiquiti adapter foundations,
- Edge Agent telemetry,
- appliance monitoring,
- AI-assisted troubleshooting.

NetSentinel AI OS can integrate with configurable AI providers such as Claude,
OpenAI, or local models when configured by the operator. No API keys are baked
into the image.

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

## Current v2.9 Visual Validation

The v2.9 visual-test ISO was built and QEMU-validated from the clean build path:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image
```

Artifact:

```text
NetSentinel-AI-OS-Live-v2.9-visual-test.iso
Size: 815792128 bytes
SHA256: c1747ee48ff336840ec66adc3353187facf2c211837bbc9336afea26cce913b2
```

Validated:

- boot splash presents NetSentinel AI OS,
- boot entries show `Start NetSentinel AI Live Appliance`,
- generic Debian splash artwork is not used as product identity,
- `/etc/motd` and `/etc/issue` contain NetSentinel AI OS,
- `/usr/local/bin/netsentinel-menu` exists,
- `/usr/local/bin/appliance-status` exists,
- Plymouth theme files are present,
- no `.env`, private keys, database dumps, or raw captures were found in the
  image payload scan.

Remaining gap: VMware manual validation is still pending. QEMU visual validation
passed.

## v4.0 Desktop Appliance ISO Build

v4.0 produced the first Desktop Appliance alpha ISO after the v3.12 readiness
gate.

```text
Artifact: /home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image/NetSentinel-AI-OS-Desktop-v4.0-alpha.iso
Size: 1.3G
SHA256: ea382d02ba749a7a084604b3dced40888226d9d35708c1ca553b2b94e87463c6
```

Validated before and after build:

- backend validation passed with `137 passed, 1 skipped, 3 warnings`,
- frontend TypeScript and production build passed,
- live-image check-only passed,
- boot menu configuration contains `NetSentinel AI OS`,
- boot entries contain `Start NetSentinel AI Live Appliance`,
- package manifest contains XFCE, LightDM, NetworkManager, browser support, and
  `open-vm-tools`,
- SquashFS contains the NetSentinel wallpaper placeholder, LightDM autologin
  config, desktop launchers, `open-netsentinel-console`, `netsentinel-menu`,
  and `appliance-status`,
- no `.env`, private keys, token files, database dumps, raw captures, or backup
  archives were found in the built binary tree scan.

Known v4.0 validation gap:

- VMware visual validation remains manual. `vmrun`, `vmware`, and `vmplayer`
  are installed on the host, but the GUI VM start did not produce a running VM
  from the Codex automation session. Follow
  `docs/DESKTOP_ISO_VM_TEST_PLAN.md` to capture boot menu, XFCE desktop,
  launcher, Control Center, and appliance status screenshots.

## v3.8 Professional Desktop Appliance Mode

v3.8 changes the OS direction from automatic kiosk launch to a professional
desktop appliance experience. The operator should not need to type a localhost
URL, but the browser should only open when the operator clicks a NetSentinel
desktop shortcut.

Selected stack:

- `xorg`
- `lightdm`
- `xfce4`
- `xfce4-terminal`
- `thunar`
- `chromium`
- `firefox-esr` fallback
- `network-manager-gnome` for WiFi/Ethernet UI
- `open-vm-tools` for VMware validation

Why this stack:

- smaller than a full GNOME/KDE desktop,
- available in Debian Bookworm repositories,
- easy to recover from through a terminal,
- suitable for a local-first network appliance and workstation-like operator experience.

Boot behavior:

1. LightDM auto-logs into the live `user` account.
2. XFCE starts with NetSentinel AI OS wallpaper and minimal desktop layout.
3. The operator clicks NetSentinel launchers for Console, Control Center,
   Appliance Status, Wireless, Security, Cloud & Hybrid, Network Tools, or docs.
4. `open-netsentinel-console` opens `http://localhost:3000/setup`, the dashboard,
   or a module route when services are reachable.
5. If services are not reachable, the helper shows guidance and recommends
   `appliance-status`.

No browser is auto-launched on boot.

v3.9 cleanup removes the obsolete Openbox/kiosk autostart path from the active
live-image staging tree. XFCE through LightDM is the only active graphical
desktop path.

Network behavior:

- Ethernet should connect automatically by DHCP through NetworkManager.
- WiFi requires operator selection through the NetworkManager applet.
- No WiFi credentials are stored in the ISO.
- Future improvement: a NetSentinel-owned WiFi setup screen.

Console fallback remains intact:

- `netsentinel-menu`
- `appliance-status`
- `systemctl status`
- `journalctl`
- `open-netsentinel-console`

## Package Set

Required:

- `systemd`
- `docker.io`
- `docker-compose`
- `git`
- `curl`
- `jq`
- `ca-certificates`
- `openssl`
- `network-manager`
- `xorg`
- `lightdm`
- `xfce4`
- `xfce4-terminal`
- `thunar`
- `chromium`
- `firefox-esr`
- `network-manager-gnome`
- `open-vm-tools`
- `firmware-linux-free`
- selected non-free-firmware packages where repository/legal policy allows
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

Desktop builds use operator-clicked launchers. They must not auto-launch a
browser or kiosk. Server-only builds show MOTD and console status with
`netsentinel-appliance-status`.

## Security Checklist

- Default passwords disabled.
- First-run setup required.
- No Debian logos, Debian artwork, Debian swirl, or distribution branding in
  product identity assets.
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

## Technical Base Attribution

NetSentinel AI OS is an independent Debian-based system. Debian is a trademark
of Software in the Public Interest, Inc. NetSentinel AI is not produced by,
endorsed by, or affiliated with the Debian Project.

## v2.8 Validation Status

- Clean VM installer test: pending in the current environment. See
  `docs/CLEAN_VM_INSTALL_TEST.md`.
- Real ISO build: failed in the current environment because `live-build` requires root privileges and `debootstrap` is missing. See `docs/REAL_ISO_BUILD_TEST.md`.
- ISO VM boot test: failed in the current environment because no ISO artifact
  could be built. See `docs/ISO_VM_BOOT_TEST.md`.
- Branding layer: staged. Issue/MOTD, ISO label, default hostname, desktop
  launcher, GRUB theme config, Plymouth theme config, wallpaper/icon
  placeholder directories, and branding hook are present and activated. Full bootloader and
  Plymouth visual verification still require a real ISO build/boot test.
