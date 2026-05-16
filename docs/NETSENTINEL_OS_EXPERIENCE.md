# NetSentinel AI OS Experience Design

**Version:** v3.9
**Status:** Desktop Appliance Experience — Professional XFCE profile, no active kiosk path

---

## 1. Design Philosophy

NetSentinel AI OS is a **purpose-built operator appliance**, not a general-purpose desktop.

Every element of the boot, login, and runtime experience should communicate:

- **Clarity** — the operator knows exactly what system they are on and what to do next
- **Focus** — no distracting desktop clutter, no consumer UI metaphors
- **Professional confidence** — premium NOC/SOC aesthetic, not a hobbyist LiveCD
- **Safety** — no default credentials shown, no insecure defaults, no hidden services

---

## 2. Boot Experience

### 2.1 GRUB Boot Menu

The operator sees:

```
NetSentinel AI OS
Network Operations • Cybersecurity • Wireless Diagnostics • Hybrid Cloud

▶  Start NetSentinel AI Live Appliance
   Start NetSentinel AI Live Appliance (safe mode)
   Utilities...
```

- No "Debian GNU/Linux" in product position
- No "Live system (amd64)" generic label
- Dark background; cyan selection highlight
- Tagline printed below the title

### 2.2 Boot Splash (Plymouth)

- Dark boot splash with "NetSentinel AI OS" centered
- Interim: text-based Plymouth theme acceptable
- Progress bar or activity indicator acceptable
- No Debian splash, no distribution logos

### 2.3 Console Login Prompt (`/etc/issue`)

```
NetSentinel AI OS
Live Appliance for Network Operations, Cybersecurity, Wireless Diagnostics & Hybrid Cloud

Console: tty1
```

- Applied by `netsentinel-first-boot.service` after `live-config` runs
- Must survive live-config issue overwrite

---

## 3. Post-Login Console Experience

### 3.1 MOTD (`/etc/motd`)

Immediately after login:

```
Welcome to NetSentinel AI OS

NetSentinel AI Console:
  http://localhost:3000/setup

LAN Access:
  http://<appliance-ip>:3000/setup

Status:
  appliance-status

Control Center:
  netsentinel-menu

Logs:
  /var/log/netsentinel/first-boot.log
```

### 3.2 Shell Prompt

Default hostname: `netsentinel-ai`

```
user@netsentinel-ai:~$
```

### 3.3 Appliance Status Command

Globally available in `PATH`:

```bash
appliance-status
```

Output should include:

- Hostname and IP
- NetSentinel service status (Docker / systemd)
- Console URL
- First-boot log status
- Brief advice if services are not yet started

---

## 4. Desktop Appliance Workflow

The target workflow for a booted appliance is:

1. Boot NetSentinel AI OS.
2. LightDM auto-logs into the live `user` account.
3. A professional XFCE desktop starts.
4. The operator chooses a NetSentinel desktop shortcut.
5. The selected shortcut opens the console, Control Center, Appliance Status, or a module workspace.
6. Terminal fallback remains available for recovery.

Default setup URL: `http://localhost:3000/setup`

Default app URL after setup: `http://localhost:3000/`

The browser is not opened automatically. This is intentional: NetSentinel AI OS
is a desktop-oriented network appliance distribution, not a forced kiosk.

v3.9 cleanup confirms that Openbox/kiosk autostart artifacts are removed from
the active live-image path. The operator opens the console from the desktop
launcher or terminal menu.

---

## 5. Professional Desktop Mode

v3.8 uses:

- LightDM for live auto-login
- XFCE for a lightweight professional desktop
- Chromium app/window mode as the preferred console browser when launched by the operator
- Firefox ESR and `xdg-open` as browser fallbacks
- XFCE Terminal as the primary terminal
- Thunar for local documentation/file access
- NetworkManager with `nm-applet` for Ethernet/WiFi management
- open-vm-tools for VMware validation

Design constraints:

- No full GNOME or KDE
- No office suite, no media player, no games
- No generic distribution wallpaper or product identity
- Console fallback remains available through `netsentinel-menu`
- No browser or console is auto-launched after boot

Ethernet should connect automatically by DHCP. WiFi requires operator selection
through NetworkManager; no WiFi password is baked into the ISO.

---

## 6. Network Tools Grouping

Network tools should be discoverable and logically grouped. The operator should be
able to find the right tool for any field scenario without remembering CLI syntax.

### Tool Group Categories

| Group | Tools |
|---|---|
| Discovery | `nmap`, `arp-scan`, `fping`, `lldpd` |
| ICMP / SNMP | `fping`, `snmpwalk`, `snmpget`, `mtr` |
| Packet Capture | `tcpdump`, `tshark` (if installed) |
| DNS / IP | `dig`, `nslookup`, `whois`, `traceroute` |
| Link / Interface | `ethtool`, `ip`, `nmcli` |
| Wireless / RF | `iwconfig`, `iwlist`, `iw` (platform dependent) |
| Performance | `iperf3`, `ping` |
| Security / SOC | `netstat`, `ss`, `nmap`, `tcpdump` |

These groups inform the Control Center menu design and documentation structure.

---

## 7. Setup URL and First-Run Safety

- Setup URL is always `http://localhost:3000/setup` on the appliance
- LAN access via `http://<appliance-ip>:3000/setup`
- No default admin credentials; first-run setup is required
- First-run is gated: without org/admin creation the system is not operational
- Setup URL is shown in MOTD, appliance-status, and first-boot log

---

## 8. No-Default-Credentials Policy

The booted ISO must:

- Not have a pre-set admin password for the NetSentinel application
- Not have a `postgres` password baked in (generated on install)
- Not have a `SECRET_KEY` baked in (generated on install)
- Not show default credentials in MOTD or issue
- Prompt the operator explicitly on first run

Live demo mode credentials (if any demo data is seeded) must be clearly labeled
as local-demo-only and never reused for real deployments.

---

## 9. System Identity Summary

| Element | Value |
|---|---|
| Hostname | `netsentinel-ai` |
| ISO volume label | `NETSENTINEL_AI` |
| Console URL | `http://localhost:3000/setup` |
| Status command | `appliance-status` |
| Log directory | `/var/log/netsentinel/` |
| First-boot log | `/var/log/netsentinel/first-boot.log` |
| App directory | `/opt/netsentinel/` |
| Service prefix | `netsentinel-` |
| MOTD title | `Welcome to NetSentinel AI OS` |
| Issue title | `NetSentinel AI OS` |
| GRUB title | `NetSentinel AI OS` |

---

## 10. Accessibility and Safety Defaults

- Console font: system default monospace (legible at standard terminal sizes)
- Color scheme must remain readable without color (color-blind safety for CLI output)
- MOTD must be printable without terminal color codes (no ANSI escape codes in static `/etc/motd`)
- Dynamic color output acceptable in `appliance-status` interactive script
- No auto-shutdown timers in live demo mode (operator controls session lifecycle)
