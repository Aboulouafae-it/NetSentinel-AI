# NetSentinel AI OS Hardware and Driver Support

Status: v3.8 desktop appliance planning and live-image profile  
Product stage: MVP / Work in Progress

## Scope

NetSentinel AI OS includes broad Linux hardware support and selected firmware packages where legally and technically available, but some WiFi chipsets may require additional firmware or vendor-specific drivers. Driver support must be validated on target hardware before field deployment.

## Target Hardware Areas

| Area | Support strategy |
| --- | --- |
| Ethernet adapters | Use Linux kernel drivers, `ethtool`, NetworkManager, and DHCP by default. |
| Intel wireless | Include `firmware-iwlwifi` when non-free-firmware repository policy allows. |
| Realtek wireless | Include `firmware-realtek` where available; some USB chipsets may still require extra DKMS drivers. |
| Atheros wireless | Include `firmware-atheros` where available. |
| Broadcom wireless | Include `firmware-brcm80211` where available; Broadcom remains chipset-dependent. |
| VMware adapters | Include `open-vm-tools` and rely on common vmxnet/e1000 virtual NIC support. |
| USB Ethernet | Supported when kernel driver is available; verify with `ip link` and `dmesg`. |
| USB WiFi | Supported when chipset driver and firmware exist; validate before field use. |

## Firmware Package Policy

The live image package profile may include selected firmware packages:

- `firmware-linux-free`
- `firmware-iwlwifi`
- `firmware-realtek`
- `firmware-atheros`
- `firmware-brcm80211`

Debian Bookworm non-free firmware requires the `non-free-firmware` archive area. Redistribution and source policy must be reviewed before release artifacts are published. Do not claim universal WiFi support.

## Verification Commands

Use these commands on target hardware:

```bash
ip link
lspci
lsusb
dmesg | grep -i firmware
rfkill
nmcli dev
nmcli dev wifi list
ethtool <interface>
```

## WiFi Workflow

Ethernet should connect automatically through DHCP.

WiFi uses NetworkManager:

```bash
nmcli dev wifi list
nmcli dev wifi connect "SSID" password "PASSWORD"
```

Operators can also use the XFCE NetworkManager applet when the desktop session is available. No WiFi password or customer network profile should be baked into the ISO.

## Known Caveats

- Some Realtek USB WiFi adapters require out-of-tree DKMS drivers not included by default.
- Some Broadcom chipsets require additional firmware or are unreliable in monitor/diagnostic modes.
- USB WiFi adapter capabilities vary widely for scanning, monitor mode, and packet capture.
- Virtual machines validate desktop behavior but not real RF/driver coverage.
- Outdoor radio diagnostics in NetSentinel AI rely primarily on device telemetry, manual RF measurements, and vendor adapters, not generic laptop WiFi drivers.
