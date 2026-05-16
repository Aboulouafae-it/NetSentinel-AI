# NetSentinel AI OS Wallpaper Specification

**Version:** v2.7 Planning

This specification guides the creation of the official wallpaper pack for NetSentinel AI OS.

## 1. Technical Requirements
- **Target Resolutions:**
  - `1920x1080` (FHD - Primary)
  - `2560x1440` (QHD)
  - `3840x2160` (4K UHD)
- **Format:** PNG or SVG.
- **Color Profile:** sRGB.

## 2. Global Constraints
- **NO distribution branding:** No Debian swirls, Ubuntu circles, Kali dragons, etc.
- **NO vendor branding:** No Cisco, Ubiquiti, Fortinet, or cloud provider logos.
- **NO noisy elements:** Wallpapers must not interfere with desktop icons or terminal text readability. Contrast is key.
- **NO generic cyberpunk:** Avoid neon grids, glowing green code, or hacker clichés.
- **NO AI-generated final assets:** AI can be used for ideation, but final assets must be original vector art or legally cleared stock composites. If placeholders are used, they must be simple SVGs.

## 3. Wallpaper Concepts

### Concept 1: Operations Center (Default)
- **Composition:** Minimal dark gradient. Subtle glowing points representing a global or regional network topology in the lower third.
- **Colors:** Deep Black (`#05070A`) fading into Dark Navy (`#0B1220`). Accents in Technical Cyan (`#0EA5E9`).
- **Visual Elements:** Interconnected nodes. Very low opacity.

### Concept 2: Wireless RF Intelligence
- **Composition:** Abstract, flowing sine waves or radar sweeps originating from off-screen or corner.
- **Colors:** Deep Black background. Waves using Technical Cyan (`#0EA5E9`) and Network Blue (`#2563EB`).
- **Visual Elements:** Smooth curves representing signal propagation and interference patterns.

### Concept 3: Hybrid Cloud Topology
- **Composition:** Isometric or flat representation of interconnected planes (representing on-premise and cloud boundaries).
- **Colors:** Deep Black and Dark Navy. Highlights in Healthy Green (`#22C55E`) indicating secure tunnels.
- **Visual Elements:** Distinct zones connected by strong, glowing data pathways.

### Concept 4: Minimal Dark Appliance
- **Composition:** Pure minimal aesthetic. Nearly solid color.
- **Colors:** `#05070A` to `#080C14` radial gradient.
- **Visual Elements:** The NetSentinel AI shield/radar logo faintly watermarked in the dead center at 5% opacity. Ideal for low-distraction NOC displays.

## 4. Safe Future Generation Instructions
If a designer or developer is generating placeholders:
1. Use code-based generation (SVG, Processing) to create geometric patterns.
2. Stick strictly to the defined hex codes.
3. Ensure the top 50% of the screen remains mostly dark to allow for terminal/window visibility.
