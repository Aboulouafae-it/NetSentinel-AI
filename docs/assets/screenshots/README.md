# NetSentinel AI Screenshot Rules

This directory contains screenshots used in GitHub and release documentation.
Screenshots must be accurate evidence from a real running NetSentinel AI app or
OS session, not generated proof.

## Rules

- Use only real screenshots from the running app, Desktop Appliance session, or
  booted ISO/VM.
- Do not add fake screenshots.
- Do not use AI-generated UI screenshots as proof of product state.
- Do not include customer data, secrets, tokens, API keys, cloud credentials, or
  private keys.
- Do not include raw packet captures or unredacted logs.
- Demo data is allowed only when clearly local/demo and reviewed.
- Redact sensitive IPs, user names, device names, domains, SNMP communities, and
  serial numbers before publication.
- Prefer consistent 16:9 or near-16:9 captures for README grids.
- Use the dark theme and current NetSentinel AI visual identity.
- Keep filenames lowercase, stable, and descriptive.

## Current Captures

These existing files are real captures from a local NetSentinel AI app instance.
Some are older RC captures and should be refreshed after the v4.0 Desktop ISO /
VMware validation pass.

| File | Page | Status |
| --- | --- | --- |
| `login.png` | Login | Available |
| `setup.png` | First-run setup | Available |
| `dashboard.png` | Dashboard / Control Center | Available, refresh recommended for v3 Control Center |
| `assets.png` | Assets inventory | Available |
| `alerts.png` | Alerts | Available |
| `incidents.png` | Incidents | Available |
| `logs.png` | Logs / syslog | Available |
| `agents.png` | Edge Agents | Available |
| `radio-devices.png` | Radio Devices | Available |
| `wireless-link-detail.png` | Wireless Link Detail | Available |
| `field-measurements.png` | Field Measurements | Available |
| `appliance-status.png` | Appliance Status | Available |

## Recommended Standard Filenames

Use these names for the next reviewed screenshot set:

| File | Target |
| --- | --- |
| `00-login.png` | Login |
| `01-setup.png` | First-run setup |
| `02-dashboard-control-center.png` | Control Center Dashboard |
| `03-network-operations.png` | Network Operations |
| `04-wireless-diagnostics.png` | Wireless Diagnostics |
| `05-security-operations.png` | Security Operations |
| `06-ai-copilot.png` | AI Copilot |
| `07-cloud-hybrid.png` | Cloud & Hybrid |
| `08-reports-export-center.png` | Reports & Export Center |
| `09-appliance-status.png` | Appliance Status |
| `10-desktop-appliance.png` | XFCE Desktop Appliance |
| `11-boot-menu.png` | NetSentinel AI OS boot menu |

Do not rename existing screenshots unless all README/docs links are updated in
the same change.

## Manual Capture Checklist

1. Start the app through the documented local workflow.
2. Complete first-run setup with local demo-only data if needed.
3. Capture each page in a clean browser profile or VM.
4. Confirm no secrets, tokens, raw captures, customer names, or real public IPs
   are visible.
5. Save screenshots under this directory.
6. Update README links only for files that exist.
7. Record the capture date and product version in release notes.
