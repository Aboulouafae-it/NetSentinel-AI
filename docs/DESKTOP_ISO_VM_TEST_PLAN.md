# NetSentinel AI OS Desktop ISO VMware Test Plan

**Version:** v4.0 Desktop ISO validation  
**Status:** ISO built; manual VMware visual validation still required.

## Objective

Validate that the NetSentinel AI OS Desktop ISO boots into a professional XFCE Desktop Appliance experience without kiosk behavior, browser auto-launch, forbidden branding, or operator confusion.

## Test Artifact

Current ISO name:

```text
NetSentinel-AI-OS-Desktop-v4.0-alpha.iso
```

Current artifact:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image/NetSentinel-AI-OS-Desktop-v4.0-alpha.iso
```

SHA256:

```text
ea382d02ba749a7a084604b3dced40888226d9d35708c1ca553b2b94e87463c6
```

The ISO was generated after the Desktop ISO preflight checklist reached READY. Static content verification passed. VMware visual validation remains manual because `vmrun` did not produce a running GUI VM from the Codex session.

## Recommended VM Profile

| Setting | Recommended value |
| --- | --- |
| VM name | NetSentinel AI OS Desktop v4.0 Alpha Test |
| CPU | 2-4 cores |
| RAM | 8 GB |
| Disk | 40-80 GB optional |
| Firmware | BIOS first, UEFI optional second pass |
| Network | NAT first, bridged optional second pass |
| Display | VMware SVGA, accelerated graphics if available |
| Boot media | `NetSentinel-AI-OS-Desktop-v4.0-alpha.iso` |

## v4.0 Attempt Result

| Check | Result | Notes |
| --- | --- | --- |
| ISO build | PASS | Hybrid ISO built successfully with `xorriso`. |
| Boot labels in binary tree | PASS | GRUB/ISOLINUX contain `NetSentinel AI OS` and `Start NetSentinel AI Live Appliance`. |
| XFCE/LightDM package manifest | PASS | Manifest includes `xorg`, `xfce4`, `lightdm`, `network-manager`, browsers, and `open-vm-tools`. |
| Staged desktop files | PASS | SquashFS contains NetSentinel launchers, wallpaper, LightDM config, and appliance commands. |
| Forbidden payload scan | PASS | No `.env`, key, dump, raw capture, or backup archive found in the built binary tree. |
| VMware CLI availability | PASS | `vmrun`, `vmware`, and `vmplayer` are installed. |
| VMware GUI boot | WARN | `vmrun -T ws start ... gui` did not produce a running VM from this automation session. Manual GUI boot remains required. |
| Screenshots | NOT TESTED | No VMware screenshots were captured. |

## Boot and Branding Checks

| Check | Expected result | Status |
| --- | --- | --- |
| ISO boots | Boot reaches NetSentinel AI OS without kernel panic. | NOT TESTED |
| Boot menu identity | Boot menu shows NetSentinel AI OS as product identity. | NOT TESTED |
| Boot entry text | Entry includes a clear NetSentinel live appliance/desktop start option. | NOT TESTED |
| Vendor branding | Debian/Kali/Ubuntu branding is not shown as the product identity. | NOT TESTED |
| Plymouth/splash | NetSentinel identity appears if splash is visible. | NOT TESTED |
| Console issue | `/etc/issue` identifies NetSentinel AI OS. | NOT TESTED |

## Desktop Experience Checks

| Check | Expected result | Status |
| --- | --- | --- |
| LightDM autologin | Live user auto-login reaches XFCE. | NOT TESTED |
| XFCE desktop | Desktop loads without crashes or missing panels. | NOT TESTED |
| No browser auto-launch | Browser does not open automatically after login. | NOT TESTED |
| No kiosk session | No forced kiosk window or Openbox session is active. | NOT TESTED |
| Wallpaper | Staged placeholder at `/usr/share/backgrounds/netsentinel-ai/netsentinel-ai-os.svg` is visible, or final replacement artwork is visible. | NOT TESTED |
| Desktop shortcuts | Only NetSentinel appliance shortcuts are present. | NOT TESTED |
| Terminal fallback | XFCE terminal opens normally. | NOT TESTED |
| NetworkManager | NetworkManager applet or connection UI is visible. | NOT TESTED |

## Network Checks

| Check | Expected result | Command or action |
| --- | --- | --- |
| Hostname | Hostname is `netsentinel-ai` or documented equivalent. | `hostname` |
| Ethernet DHCP | NAT interface receives an address automatically. | `ip addr`, `nmcli dev status` |
| DNS resolution | DNS works through NAT. | `resolvectl status`, `dig example.com` |
| WiFi workflow | WiFi connection workflow is available if hardware exists. | NetworkManager UI, `nmcli dev wifi list` |
| No baked WiFi credentials | No customer WiFi profile exists by default. | Inspect NetworkManager connections |

## Launcher Checks

| Launcher | Expected result | Status |
| --- | --- | --- |
| NetSentinel AI Console | Opens local UI if services are running, otherwise friendly service-not-running message. | NOT TESTED |
| NetSentinel AI Control Center | Opens terminal and runs `netsentinel-menu`. | NOT TESTED |
| NetSentinel Appliance Status | Opens terminal and runs `appliance-status`. | NOT TESTED |
| Network Tools | Opens guided network tools terminal flow. | NOT TESTED |
| Packet Tools | Opens packet analysis guidance without starting packet capture automatically. | NOT TESTED |
| Wireless Diagnostics | Opens `/wireless` through the console helper. | NOT TESTED |
| Security Operations | Opens `/security` through the console helper. | NOT TESTED |
| Cloud & Hybrid | Opens `/cloud-hybrid` through the console helper. | NOT TESTED |
| Reports & Export Center | Opens `/reports` through the console helper. | NOT TESTED |
| NetSentinel Documentation | Opens local docs or README. | NOT TESTED |

## In-VM Command Checklist

Run these commands inside the booted VM and record the output in the release notes.

```bash
hostname
cat /etc/issue
cat /etc/motd
which open-netsentinel-console
which netsentinel-menu
netsentinel-menu
which appliance-status
appliance-status
nmcli dev status
ip addr
ls -la ~/Desktop
ls -la /var/log/netsentinel
cat /var/log/netsentinel/first-boot.log 2>/dev/null || true
```

## Service and Console Checks

| Check | Expected result | Status |
| --- | --- | --- |
| Frontend service | If installed and started, `http://localhost:3000` responds. | NOT TESTED |
| Setup route | `http://localhost:3000/setup` responds when app is available. | NOT TESTED |
| Backend service | If started, `http://localhost:8000` responds. | NOT TESTED |
| API docs | `http://localhost:8000/docs` responds when backend is available. | NOT TESTED |
| Friendly fallback | Console helper explains service-not-running state if app stack is down. | NOT TESTED |

## Security and Payload Checks in VM

| Check | Expected result | Status |
| --- | --- | --- |
| No `.env` files | No environment files are shipped in the live user or app payload. | NOT TESTED |
| No private keys | No SSH/cloud/private keys are shipped. | NOT TESTED |
| No database dumps | No SQL/DB dump files are shipped. | NOT TESTED |
| No packet captures | No raw packet capture files are shipped. | NOT TESTED |
| No cloud credentials | No AWS/Azure/GCP/Cloudflare credential files are shipped. | NOT TESTED |
| No customer data | No customer-specific files are shipped. | NOT TESTED |

Suggested in-VM scan:

```bash
sudo find / -xdev \( -name '.env' -o -name '*.pem' -o -name '*.key' -o -name '*.pcap' -o -name '*.pcapng' -o -name '*.sql' -o -name '*.dump' \) -print 2>/dev/null
```

Do not print secret contents if any suspicious file is found. Record path and category only.

## Screenshots to Capture

| Screenshot | Required content |
| --- | --- |
| Boot menu | NetSentinel AI OS identity and boot entry. |
| Desktop after login | XFCE desktop, staged NetSentinel placeholder or final wallpaper, no browser auto-launch. |
| NetworkManager | Network applet or connection workflow visible. |
| Console launcher result | Local UI or friendly service-not-running message. |
| Control Center | `netsentinel-menu` visible in terminal. |
| Appliance Status | `appliance-status` output visible. |
| Reports shortcut | Reports workspace or friendly fallback. |

## Pass Criteria

The future VMware visual test passes only if:

1. The ISO boots successfully.
2. LightDM reaches XFCE Desktop Appliance mode.
3. The browser does not auto-launch.
4. Kiosk/Openbox does not appear.
5. NetSentinel AI OS is the visible product identity.
6. Desktop shortcuts work or produce clear service-not-running guidance.
7. Ethernet DHCP works in NAT mode.
8. Terminal fallback works.
9. No forbidden payloads or secrets are present.
10. No serious visual branding gaps remain.

## Failure Handling

If any branding still shows a generic distribution identity as product identity, do not proceed to persistence or installer work. Collect:

```bash
hostname
cat /etc/issue
cat /etc/motd
find / -name '*netsentinel*' 2>/dev/null | head -100
```

Then fix only branding/boot/desktop integration issues before retesting.
