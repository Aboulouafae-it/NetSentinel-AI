# NetSentinel AI OS Brand Guidelines

**Version:** v2.5 Planning
**Status:** Design Foundation — Not Final Art

---

## 1. Product Identity

### Official Name

**NetSentinel AI OS**

Full name for formal context: *NetSentinel AI Operating System*

### Edition Names

| Edition | Label |
|---|---|
| Live demo | NetSentinel AI Live Appliance |
| Installed appliance | NetSentinel AI Appliance |
| Console UI | NetSentinel AI Console |
| Monitoring agent | NetSentinel Edge Agent |

### Tagline

> **Network Operations • Cybersecurity • Wireless Diagnostics • Hybrid Cloud**

Used verbatim in:

- GRUB/ISOLINUX boot menu subtitle
- Console MOTD
- Dashboard header
- Marketing materials

### Naming Rules

- Never present as "Debian Live", "Debian GNU/Linux", or any third-party OS name
- Never use "Home", "Personal", or "Community" edition naming
- Never abbreviate to "NSA" (conflict with a government agency acronym)
- Short form: **NetSentinel** (acceptable in UI labels, command names, log prefixes)
- CLI prefix: `netsentinel-` or `ns-` for commands and services
- ISO label: `NETSENTINEL_AI` (uppercase, underscore, no spaces)
- Hostname default: `netsentinel-ai`

---

## 2. Visual Identity Direction

### Tone

**Dark enterprise NOC/SOC aesthetic.** Premium, minimal, technical.

Think: the control room of a network operations center — not a consumer OS.
References: dark terminal environments, RF spectrum visualizers, satellite uplink displays,
cloud infrastructure dashboards.

### Primary Color Palette (Proposal)

| Role | Color | Hex | Notes |
|---|---|---|---|
| Background dark | Deep navy | `#0A0E1A` | Primary shell/GRUB/terminal bg |
| Background panel | Dark slate | `#101828` | Secondary panels |
| Accent primary | Cyan/electric blue | `#00BFFF` | Interactive highlights, active state |
| Accent secondary | Teal | `#00D4B4` | Secondary actions, wireless indicators |
| Accent alert | Amber | `#F5A623` | Warning and degraded states |
| Accent critical | Deep red | `#E53935` | Critical alerts, security events |
| Text primary | Off-white | `#E8EDF4` | Body text |
| Text muted | Cool gray | `#7B8FAB` | Labels, hints, muted fields |
| Border | Dark steel | `#1E2D45` | Panel borders |
| Success | Emerald | `#00C853` | Healthy state, link-up |

### Typography Direction

- **Console / terminal:** monospace, preferably `JetBrains Mono`, `Fira Code`, or
  `DejaVu Sans Mono` (all open-source / system-available)
- **Boot screen title:** bold sans-serif, system font or embedded open-source font
- **Dashboard (browser):** `Inter` via Google Fonts (already in frontend)
- No proprietary fonts (no Adobe Typekit, no commercial fonts)
- No Debian system fonts used as brand identity

---

## 3. Boot Screen Direction

### GRUB Boot Menu

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              NetSentinel AI OS                               │
│   Network Operations • Cybersecurity • Wireless Diagnostics  │
│                   • Hybrid Cloud                             │
│                                                              │
│  ▶  Start NetSentinel AI Live Appliance                      │
│     Start NetSentinel AI Live Appliance (safe mode)          │
│     Utilities...                                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Visual rules:

- Dark background (`#0A0E1A` or nearest grub-supported approximation)
- Cyan highlight for the selected entry (`#00BFFF`)
- No Debian logo, Debian swirl, or distribution logos
- No generic "Boot menu" title — always "NetSentinel AI OS"
- Background image: optional dark abstract network/RF-style image (original or CC0 only)

### GRUB Theme Files

Location in build tree: `deploy/live-image/bootloaders/grub-pc/live-theme/theme.txt`

The theme file must define:

- `desktop-color` / background
- `title-text`
- `title-color`
- `item-color`, `selected-item-color`
- `menu-color-normal`, `menu-color-highlight`

No external font embedding until a vetted open-source font workflow is confirmed.

### Plymouth Boot Splash

Direction:

- Theme location: `deploy/live-image/branding/plymouth/netsentinel-ai/`
- Minimal dark splash with "NetSentinel AI OS" label
- No animated spinner relying on proprietary assets
- Can use the text-based Plymouth theme as an interim safe baseline

---

## 4. Console & Terminal Style

### /etc/issue (login prompt banner)

```
NetSentinel AI OS
Live Appliance for Network Operations, Cybersecurity, Wireless Diagnostics & Hybrid Cloud

Console: tty\n
```

### /etc/motd (post-login message)

```
Welcome to NetSentinel AI OS

NetSentinel AI Console:
  http://localhost:3000/setup

LAN Access:
  http://<appliance-ip>:3000/setup

Status:
  appliance-status

Logs:
  /var/log/netsentinel/first-boot.log
```

Rules:

- No Debian branding in MOTD or issue
- No default credentials printed
- No version numbers in issue (avoids stale text across builds)
- First-boot service is responsible for restoring NetSentinel branding if `live-config` overwrites it

### Shell Prompt

Default live user shell prompt direction:

```
user@netsentinel-ai:~$
```

No custom prompt colors required in v2.5; focus on hostname correctness.

---

## 5. Wallpaper Direction

Wallpaper must be:

- **Original artwork** or **CC0 licensed** (no Debian, no distribution-specific art)
- Dark background (consistent with `#0A0E1A` palette)
- Abstract technical theme: network topology lines, RF waveforms, or circuit patterns
- High contrast, no photography of real-world locations or identifiable hardware
- Resolution: minimum 1920×1080

Interim fallback: plain dark color (`#0A0E1A`) is acceptable until original art is produced.

Location: `deploy/live-image/branding/wallpapers/`

---

## 6. Icon Direction

- System icons: follow the existing desktop environment defaults (Xfce/LXDE if added)
- NetSentinel-specific application icons: to be designed as original SVG assets
- No Debian pinwheel, no Ubuntu circle, no third-party distribution icons
- NetSentinel AI Console launcher icon: dark background, cyan network symbol (placeholder)
- Appliance Status icon: status indicator style (green/red dot on dark bg)

Location: `deploy/live-image/branding/icons/`

---

## 7. Forbidden Assets

The following assets **must never appear** in NetSentinel AI OS as product identity:

| Asset | Reason |
|---|---|
| Debian logo / pinwheel | Third-party trademark |
| Debian swirl | Third-party trademark |
| Ubuntu circle of friends | Third-party trademark |
| Red Hat / Fedora logos | Third-party trademark |
| Any Linux Foundation logos | Context-specific use only |
| Proprietary fonts (Adobe, etc.) | License incompatibility |
| Commercial stock photography | License incompatibility |
| Government / agency logos | Legal risk |
| AI-generated images with unclear licensing | Legal uncertainty |

Debian may appear **only** in:

- Technical base attribution sections in documentation
- Package manager output (unavoidable)
- Legal attribution footer (`NetSentinel AI OS is an independent Debian-based system...`)

---

## 8. Technical Base Attribution (Required)

All distribution documentation must include:

> NetSentinel AI OS is an independent Debian-based system. Debian is a trademark
> of Software in the Public Interest, Inc. NetSentinel AI is not produced by,
> endorsed by, or affiliated with the Debian Project.

---

## 9. Asset Review Workflow

Before any new image, font, or graphical asset is added to the repository:

1. Confirm license (CC0, MIT, Apache 2.0, or original work)
2. Document source and license in `deploy/live-image/branding/ASSET_SOURCES.md`
3. Strip metadata from images (no GPS, no author, no creation tool fingerprints)
4. Peer-review the asset before ISO inclusion
