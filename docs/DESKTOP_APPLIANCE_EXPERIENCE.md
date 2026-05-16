# NetSentinel AI OS Desktop Appliance Experience

Status: v3.9 cleanup profile  
Product stage: MVP / Work in Progress

## Decision

NetSentinel AI OS should boot into a professional desktop appliance experience, not an automatic kiosk. The operator chooses what to open from the desktop.

This means:

- No browser auto-launch after boot.
- No forced kiosk session.
- Desktop shortcuts provide direct access to NetSentinel workspaces.
- Terminal recovery remains fully available.
- The OS stays focused on network, security, wireless, cloud/hybrid diagnostics, and appliance operations.

## v3.9 Cleanup Result

The active desktop path is XFCE through LightDM. Kiosk/Openbox artifacts are not
part of the active live-image path:

- no `netsentinel-kiosk.desktop` autostart file,
- no Openbox autostart file,
- no `netsentinel-openbox` X session,
- no staged `/usr/local/bin/netsentinel-kiosk`,
- no `deploy/live-image/scripts/netsentinel-kiosk.sh`.

The desktop profile is ready for a future ISO rebuild validation pass, but the
ISO has not been rebuilt as part of v3.9.

## Desktop Stack

Selected stack:

- XFCE
- LightDM
- NetworkManager
- XFCE Terminal
- Thunar
- Chromium with Firefox ESR fallback
- NetworkManager applet
- VMware tools

Why XFCE:

- Lightweight enough for live images and VMware.
- Stable and widely supported on Debian Bookworm.
- Customizable without pulling in a large GNOME/KDE stack.
- Comfortable for appliance/workstation use.
- Keeps terminal fallback and file access simple.

## Browser Behavior

The browser does not open automatically.

Desktop shortcuts call:

```bash
open-netsentinel-console
```

The helper checks whether the local frontend is reachable and opens:

- `http://localhost:3000/setup` for first-run setup.
- `http://localhost:3000` when the base UI is reachable.
- module routes such as `/wireless`, `/security`, or `/cloud-hybrid` when launched from specific shortcuts.

If services are not ready, the helper shows a friendly message and recommends `appliance-status`.

## Desktop Shortcuts

Staged under `deploy/live-image/includes.chroot/etc/skel/Desktop/`:

- NetSentinel AI Console
- NetSentinel AI Control Center
- NetSentinel Appliance Status
- Network Tools
- Packet Tools
- Wireless Diagnostics
- Security Operations
- Cloud & Hybrid
- Reports & Export Center
- NetSentinel Documentation

## Visual Identity

The desktop profile stages:

- NetSentinel AI OS wallpaper placeholder at
  `/usr/share/backgrounds/netsentinel-ai/netsentinel-ai-os.svg`.
- XFCE wallpaper binding in
  `deploy/live-image/includes.chroot/etc/skel/.config/xfce4/xfconf/xfce-perchannel-xml/xfce4-desktop.xml`.
- XFCE dark theme preference.
- Minimal XFCE panel.
- Desktop system icons disabled.
- Only NetSentinel operator launchers are intended to appear on the desktop.

The staged wallpaper is an original placeholder asset for the live-image profile.
Final designer wallpaper artwork remains future visual polish and is not required
for the next ISO validation pass.

No Debian/Kali/Ubuntu/vendor branding should appear as the product identity.

## Network Tool Philosophy

Default tools should serve the NetSentinel mission:

- network discovery,
- IP/DNS troubleshooting,
- packet analysis,
- SNMP,
- WiFi/network diagnostics,
- VPN/cloud diagnostics foundation,
- appliance operations,
- security/syslog monitoring.

Avoid:

- office suites,
- games,
- media editors,
- unrelated heavy desktop utilities,
- generic bloat,
- offensive tooling that does not serve monitoring/diagnostics.

## Ethernet and WiFi

Ethernet:

- NetworkManager should connect via DHCP automatically.

WiFi:

- Operator uses NetworkManager applet, `nmtui`, or `nmcli`.
- No WiFi password is baked into the ISO.
- No customer network profile is included.

Useful commands:

```bash
nmtui
nmcli dev
nmcli dev wifi list
nmcli dev wifi connect "SSID" password "PASSWORD"
```

## Console Fallback

The desktop is not required for recovery.

Supported fallback commands:

```bash
netsentinel-menu
appliance-status
systemctl status
journalctl
open-netsentinel-console
```

## Future Work

- Final custom icon set.
- Final wallpaper artwork.
- Offline HTML documentation viewer.
- Desktop menu category for NetSentinel Tools.
- Optional packaging profiles for hardware-specific firmware bundles.
- Manual VMware screenshots for the v4.0 Desktop ISO.
- Real-hardware visual validation after VMware validation passes.

## v4.0 Desktop ISO Status

The first Desktop Appliance alpha ISO was built successfully:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image/NetSentinel-AI-OS-Desktop-v4.0-alpha.iso
SHA256: ea382d02ba749a7a084604b3dced40888226d9d35708c1ca553b2b94e87463c6
```

Static verification confirmed the XFCE/LightDM desktop path, NetSentinel
wallpaper binding, desktop launchers, NetworkManager/browser support, and
appliance helper commands are present in the built image.

VMware visual validation is still pending. VMware CLI tools are available on the
host, but the automated GUI start did not produce a running VM from this session.
Do not treat v4.0 as visually validated until the VMware test plan screenshots
are captured.
