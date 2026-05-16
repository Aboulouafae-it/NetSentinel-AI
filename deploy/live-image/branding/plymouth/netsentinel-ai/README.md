# NetSentinel AI OS Plymouth Theme Prototype

**Status:** Text-Only Prototype

This directory stages a minimal Plymouth boot splash for NetSentinel AI OS.

## Displayed Identity

```text
NetSentinel AI OS
Network Operations • Cybersecurity • Wireless Diagnostics • Hybrid Cloud
```

## Visual Direction
- **Background:** Calm, dark minimal background (`#05070A`).
- **Typography:** Professional text-only presentation using system fonts.
- **Progress:** Subtle progress indication text (e.g., "Starting NetSentinel AI Live Appliance..."). No noisy spinning animations.
- **Compatibility:** Must be readable in VMware console, Proxmox VNC, and raw bare-metal framebuffers.
- **Branding Limits:** No Debian artwork, no third-party copyrighted images, no proprietary fonts, no real customer topology, no secrets, no generic AI-generated commercial art.

## Future Visual Animation Requirements
If moving beyond a text-only script:
1. Use a static, optimized SVG or PNG for the central logo.
2. Use a smooth, linear loading bar or a subtle pulsing alpha channel on the logo to indicate activity.
3. Keep the total theme size under 1MB to ensure fast initramfs loading.

## Activation
Activation is staged by the live-build branding hook when Plymouth is present. Final activation may require package-level Plymouth configuration in the ISO build.
