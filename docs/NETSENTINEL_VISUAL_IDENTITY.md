# NetSentinel AI OS Visual Identity

**Version:** v3.8 Planning
**Status:** Design Specification

This document defines the visual identity for the NetSentinel AI operating system and web platform. NetSentinel AI is not a generic consumer operating system, nor is it a standard web application. It is a purpose-built appliance for Network Operations and Cybersecurity.

---

## 1. Brand Concept
NetSentinel AI serves as the central intelligence node for local network operations, outdoor RF diagnostics, and hybrid cloud monitoring. The brand must communicate reliability, advanced capability, and uncompromising security. It is a "black box" appliance interface brought to life.

## 2. Target Audience
- Network Engineers
- Security Operations Center (SOC) Analysts
- Wireless Internet Service Providers (WISPs)
- Systems Administrators
- Field Technicians

## 3. Emotional Tone
- **Authoritative:** Commands respect; feels like a professional-grade tool.
- **Calm & Focused:** Reduces cognitive load; emphasizes data over decoration.
- **Precise:** Sharp lines, clear boundaries, exact measurements.
- **Advanced:** Subtle tech-forward elements without crossing into sci-fi parody.

## 4. Visual Style
- **Dark Enterprise:** The primary UI mode is dark. This reduces eye strain in NOC/SOC environments and emphasizes brightly colored data points (alerts, active links).
- **Minimal & Sharp:** Eliminate unnecessary borders, gradients, and shadows. Use flat, clean geometry.
- **Technical Typography:** Monospaced fonts for data, clean sans-serif for UI.
- **Data-Forward:** Information density should be high but structured.

## 5. Color Palette

*Suggested Palette (Requires Finalization)*

| Color | Hex | Use Case |
| :--- | :--- | :--- |
| **Deep Black** | `#05070A` | Main application background, boot background |
| **Dark Navy** | `#0B1220` | Card backgrounds, panel areas, terminal background |
| **Technical Cyan** | `#0EA5E9` | Primary action color, active states, progress bars |
| **Network Blue** | `#2563EB` | Secondary accents, informational badges |
| **Healthy Green** | `#22C55E` | System healthy, link up, success states |
| **Warning Yellow** | `#EAB308` | Degraded state, medium severity alerts |
| **Critical Red** | `#DC2626` | Down state, critical security alerts, destructive actions |
| **Main Text** | `#E5E7EB` | Primary body copy, headings |
| **Muted Text** | `#94A3B8` | Secondary labels, disabled text, table headers |

## 6. Typography Guidance
- **System/Open Fonts Only:** Do not use proprietary or commercially licensed fonts unless explicitly approved and purchased.
- **UI/Headings:** `Inter`, `Roboto`, or system-default Sans-Serif. Clean, highly legible.
- **Data/Terminal:** `JetBrains Mono`, `Fira Code`, or system-default Monospace. Must clearly distinguish between `0`/`O` and `1`/`l`.

## 7. Logo Concept
- **Motifs:** Shield, radar, network nodes, RF waves, telemetry pulse.
- **Style:** Strong silhouette, vector-based, simple geometry.
- **Adaptability:** Must work at 16x16 (favicon) and 1024x1024 (boot screen). Must work in pure monochrome.

## 8. Boot Screen Concept (Plymouth / GRUB)
- Pure `#05070A` background.
- Centered, high-resolution logo.
- Minimal, smooth loading indicator (no noisy spinning gears or verbose text by default).
- "NetSentinel AI OS" clearly visible.

## 9. Wallpaper Concept
Wallpapers for the optional desktop environment should be abstract and technical:
1. Operations Center (subtle global nodes)
2. Wireless RF Intelligence (abstract signal waves)
3. Hybrid Cloud Topology (interconnected graph)
4. Minimal Dark Appliance (pure dark gradient with subtle logo)

v3.8 stages an original SVG placeholder wallpaper at
`/usr/share/backgrounds/netsentinel-ai/netsentinel-ai-os.svg` in the live image
profile. It is intentionally simple, dark, and brand-owned until final artwork
is produced.

## 10. Icon Style
- SVG format.
- Consistent 1.5px or 2px stroke width.
- Monochrome or dual-tone (Dark Navy + Technical Cyan).
- Recognizable at 24x24 pixels.

## 11. Terminal & MOTD Visual Rules
- **Legibility First:** No excessive ASCII art that breaks on 80x24 terminals.
- **Focus:** Highlight actionable URLs (e.g., Setup URL).
- **Branding:** Use simple, clean text to identify the system. No generic distribution logos.

## 12. Dashboard Consistency Notes
- KPI cards must share identical padding, corner radius, and shadow (if any).
- Badges (Status, Severity) must use the exact semantic colors defined in the palette.
- Charts should use the brand palette (Cyan, Blue, Green, Red, Yellow) consistently.

## 13. Accessibility & Readability Rules
- Ensure WCAG AA contrast ratio for text against background (especially Cyan on Navy).
- Never rely on color alone to convey meaning (e.g., a "Down" state must have an icon/text label, not just be red).
- Color-blind safe palette adjustments for data visualizations where possible.

## 14. Forbidden Visual Styles
- **No generic cyberpunk:** Avoid excessive neon glow, matrix-style falling code, or over-the-top hacker aesthetics.
- **No overly rounded UI:** Avoid "bubbly" or childish consumer app aesthetics. Keep corners sharp or subtly rounded (e.g., 4px - 6px).
- **No flat generic Bootstrap look:** It must feel custom and premium.
- **No fake data:** Dashboards must not display generic placeholder graphs if no data exists; show "No Data / Waiting for Telemetry".

## 15. Forbidden Assets
- **NO Debian, Kali, Ubuntu, or other upstream distribution logos/artwork.**
- **NO vendor logos** (Cisco, Ubiquiti, Fortinet, etc.) without explicit legal permission (use generic hardware icons).
- **NO copyrighted images or unverified icon packs.**
- **NO unreviewed AI-generated commercial artwork.** All AI generation must be manually vetted and used as inspiration or heavily edited into original vector assets.
