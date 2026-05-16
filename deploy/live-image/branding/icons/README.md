# NetSentinel AI Icon Pack Plan

**Version:** v2.7 Planning
**Status:** Design Specification

This document defines the requirements for the official NetSentinel AI OS icon pack.

## Core Requirements
1. **SVG-First:** All icons must be delivered as clean, optimized SVGs.
2. **Stroke Width:** Consistent 1.5px or 2px stroke width across the entire set.
3. **Colors:** Monochrome (using Main Text `#E5E7EB` or Technical Cyan `#0EA5E9`) or dual-tone variants.
4. **Legibility:** Must remain perfectly recognizable and crisp at 16x16px and 24x24px.
5. **Dark/Light Compatibility:** While the primary OS is dark mode, icons must be adaptable for light backgrounds if printed or exported.
6. **Licensing:** **NO copied icon packs** (e.g., FontAwesome, Material Icons, Feather) unless the license is explicitly verified, documented, and legally cleared for commercial distribution. Original creation is preferred.

## Required Icons
The following icons are required for the Control Center and the web dashboard menus:

- **NetSentinel AI Console:** Primary dashboard/home icon.
- **NetSentinel Control Center:** The main application launcher icon (distinct from the logo).
- **Appliance Status:** Server/hardware health representation.
- **Network Tools:** Terminal/network utility representation (e.g., overlapping network nodes with a wrench).
- **Packet Capture:** Traffic analysis representation (e.g., magnifying glass over a data stream).
- **Wireless Diagnostics:** RF wave / antenna representation.
- **Syslog & Security:** Shield / log file representation.
- **Cloud & Hybrid:** Cloud outline with a secure tunnel/connection.
- **Documentation:** Book or manual icon.

## Implementation Notes
Until the final icon pack is commissioned and approved, generic system-provided icons (e.g., GTK default icons) are used by `.desktop` files (e.g., `utilities-terminal`).
