# NetSentinel AI OS GRUB Theme Prototype

**Status:** Prototype

This directory stages the boot menu branding for NetSentinel AI OS.

## User-Facing Identity
- **Title:** NetSentinel AI OS
- **Boot entry:** Start NetSentinel AI Live Appliance
- **ISO label:** `NETSENTINEL_AI`

## Visual Direction
- **Background:** Dark enterprise network/security look. Pure dark navy or black. Subtle network-line frame.
- **Typography:** Clean, readable technical typography using system fonts only.
- **Branding Limits:** No Debian logos, no vendor branding, no copyrighted assets.

## Activation Status
`theme.txt` is currently a prototype specification. Final graphical theme activation requires:
1. Creation of the official background PNG.
2. live-build bootloader configuration (e.g., configuring `grub-efi` to explicitly load the theme package during the ISO build).
3. Final legal review of the included assets.

Until activation, the text-based GRUB configuration applied via `010-grub-menu.hook.binary` serves as the primary branding mechanism.
