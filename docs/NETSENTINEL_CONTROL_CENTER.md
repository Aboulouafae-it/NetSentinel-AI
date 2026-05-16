# NetSentinel AI Control Center

**Version:** v3.8
**Status:** Terminal Control Center + Desktop Appliance Launchers

---

## 1. Overview

The **NetSentinel AI Control Center** is the operator's local launchpad for all
appliance functions. It is not a cloud portal — it is a locally available interface
(terminal menu, desktop launcher, or lightweight GUI) that organizes all NetSentinel
capabilities in one discoverable place.

Design goals:

- Works on console-only (no desktop required)
- Works with or without a browser session open
- Organized by operator workflow, not by implementation detail
- No external network required to access the Control Center itself

---

## 2. Sections

### 2.1 Launch NetSentinel AI Console

**Purpose:** Open the main web dashboard.

| Mode | Implementation |
|---|---|
| Terminal menu | Print URL and open with `xdg-open` if available |
| Desktop launcher | `.desktop` file calling `open-netsentinel-console` |
| Automatic kiosk | Not used in v3.8; operator chooses what to open |

URL: `http://localhost:3000/setup`

After first-run setup: `http://localhost:3000/`

In v3.8, the desktop launcher calls `open-netsentinel-console`. The helper checks
local service readiness, opens the browser only when clicked, and shows a clear
message if services are not running.

---

### 2.2 Appliance Status

**Purpose:** Show the current health of the NetSentinel AI appliance.

| Mode | Implementation |
|---|---|
| Terminal | `appliance-status` command |
| Desktop launcher | Terminal window running `appliance-status` |
| GUI panel (future) | Service health view with live refresh |

`appliance-status` must report:

- Hostname and IP
- Docker/compose service status
- Backend API health
- Frontend reachability
- First-boot log status
- Setup URL

v3.8 includes a desktop launcher named **NetSentinel Appliance Status**. It opens a terminal
and runs `appliance-status` without requiring the operator to remember the
command.

### 2.2.1 Desktop Recovery

If the local console is not reachable, `open-netsentinel-console` tells the
operator to run `appliance-status` or start the appliance stack. The terminal
Control Center remains the supported recovery interface for field operators and
administrators.

---

### 2.3 Network Tools

**Purpose:** Launch common network diagnostic tools.

MVP (terminal menu):

```
[1] nmap scan (local subnet)
[2] arp-scan (LAN discovery)
[3] fping sweep
[4] mtr (traceroute + ping)
[5] traceroute
[6] dig / DNS lookup
[7] whois
[8] ethtool (interface info)
[9] Custom command
```

Future (GUI launcher):

- Graphical tool palette organized by workflow
- Preset scan profiles (quick subnet scan, full port scan, SNMP sweep)
- Results saved to `/var/log/netsentinel/diagnostic-runs/`

---

### 2.4 Packet Capture

**Purpose:** Capture and analyze network traffic.

MVP (terminal menu):

```
[1] tcpdump (select interface, save to file)
[2] tshark quick capture (if installed)
```

Rules:

- Captures written to `/opt/netsentinel/captures/` or `/tmp/` (not in ISO)
- No captures baked into ISO
- Operator must explicitly start/stop

Future:

- Integration with NetSentinel backend for log/alert correlation
- Automatic PII redaction option

---

### 2.5 Wireless Diagnostics

**Purpose:** Outdoor WiFi and radio link diagnostics.

MVP (terminal menu):

```
[1] Show wireless interfaces (iw dev)
[2] Scan for APs (iwlist scan or iw scan)
[3] Show link quality (iwconfig)
[4] Open NetSentinel Wireless Dashboard
[5] Record manual RF measurement
```

Future:

- Guided PowerBeam / NanoBeam / CPE / MikroTik alignment workflow
- Automated RF snapshot with health score
- Antenna alignment assistant

See `docs/WIRELESS_DIAGNOSTICS_WORKFLOW.md` for full workflow specification.

---

### 2.6 Syslog & Security

**Purpose:** Access log streams and security events.

MVP (terminal menu):

```
[1] Tail NetSentinel logs (/var/log/netsentinel/)
[2] journalctl (system journal)
[3] Open NetSentinel Syslog view (browser)
[4] Open NetSentinel Security Events (browser)
```

Future:

- Live threat indicator feed in the control panel
- Real-time alert count from backend API

---

### 2.7 Cloud & Hybrid

**Purpose:** Monitor and triage cloud-integrated infrastructure.

MVP:

- Link to NetSentinel AI Console cloud section (if configured)
- Manual connectivity checks: `ping`, `traceroute`, `curl` to cloud endpoints

Future (post-cloud-integration milestone):

- AWS VPC topology view
- Azure VNet status
- Cloudflare tunnel health
- VPN tunnel monitoring shortcuts

See `docs/CLOUD_HYBRID_ROADMAP.md` for full roadmap.

---

### 2.8 Documentation

**Purpose:** Offline-accessible operator documentation.

MVP:

```
[1] Open LIVE_APPLIANCE_IMAGE.md (local)
[2] Open appliance-status help
[3] Open first-boot log
[4] Open WIRELESS_DIAGNOSTICS_WORKFLOW.md
[5] Online documentation (if network available)
```

Future:

- Local offline HTML documentation viewer
- Context-sensitive help from within Control Center panels

---

### 2.9 Terminal

**Purpose:** Drop to a raw terminal from any Control Center context.

MVP:

- Exits back to system shell from terminal menu
- Desktop launcher: opens `xterm` or `gnome-terminal` equivalent

---

## 3. MVP Implementation Plan

### 3.1 Terminal Menu (`netsentinel-menu`)

A single Bash script at `/usr/local/bin/netsentinel-menu`:

```
netsentinel-menu
```

Uses a `select` loop or `dialog`/`whiptail` (if available) for navigation.

- Runs on any TTY or SSH session
- No external dependencies beyond standard system utilities
- Launches sub-sections as sub-menus or sub-scripts

Script location: `deploy/live-image/scripts/netsentinel-menu.sh`
Install path: `/usr/local/bin/netsentinel-menu`

Status: **Implemented**. Included in v2.6.

### 3.2 Desktop Launchers (if desktop is enabled)

`.desktop` files in `/etc/skel/Desktop/`:

| Launcher | Executable |
|---|---|
| `netsentinel-ai.desktop` | `open-netsentinel-console` |
| `netsentinel-control-center.desktop` | terminal running `netsentinel-menu` |
| `netsentinel-appliance-status.desktop` | terminal running `appliance-status` |
| `netsentinel-network-tools.desktop` | terminal guidance and Control Center |
| `netsentinel-packet-tools.desktop` | packet analysis guidance |
| `netsentinel-wireless-diagnostics.desktop` | `open-netsentinel-console /wireless` |
| `netsentinel-security-operations.desktop` | `open-netsentinel-console /security` |
| `netsentinel-cloud-hybrid.desktop` | `open-netsentinel-console /cloud-hybrid` |
| `netsentinel-documentation.desktop` | local documentation path |

### 3.3 Appliance Status Command

Already implemented prototype at:

- `deploy/live-image/scripts/appliance-status.sh`
- Installed to `/usr/local/bin/appliance-status`

### 3.4 Documentation Links

Markdown files available at `/opt/netsentinel/docs/` (future: bundle key docs).

---

## 4. Future GUI Control Panel

A lightweight local web panel (separate from the main dashboard) or Electron/GTK app:

| Panel | Feature |
|---|---|
| Overview | Service health cards, last seen, uptime |
| Network Tools | Graphical tool launcher with output viewer |
| Wireless | Guided RF workflow with form capture |
| Logs | Scrollable live log view |
| Settings | Appliance config (hostname, NTP, SSH toggle) |
| Diagnostics | Self-test and health check runner |

Technology options (not yet chosen):

- Lightweight local HTTP server + browser (low dependency)
- Electron (heavier but consistent UX with desktop version)
- GTK4 (native, minimal, requires GTK4 in image)

Decision deferred to after the Live Appliance MVP is validated.

---

## 5. Visual UX Language

To ensure the Control Center feels like a premium appliance OS rather than a generic Linux script, the following visual rules apply to the terminal menu and any future GUI:

- **Section Names:** Keep them clear and action-oriented (e.g., "Network Tools", not "Misc Linux Stuff").
- **Short Descriptions:** Provide concise context for commands. Do not assume operator familiarity with every flag.
- **Warning Text:** Use `YELLOW` (or warning icons in GUI) for actions that may cause disruption.
- **Status Wording:** Be objective. Use "unavailable" instead of "broken" or "failed".
- **Safe Command Examples:** When showing tools, provide examples that are safe to run (e.g., `ping -c 4` instead of an endless `ping`).
- **No Scary Fake Alerts:** Do not simulate intrusion alerts or "hacker" text. 
- **No Fake Stats:** If a tool isn't installed or data is missing, report it as missing.
- **No Generic Linux Feel:** Hide noisy output unless requested. The menu must be clean.
- **Clear Grouping:** Maintain the core taxonomy: Network, Wireless, Security, Cloud, Appliance.
