# NetSentinel AI Logo Direction

**Status:** Placeholder Stage / Concept Defined

This directory contains the branding assets for the NetSentinel AI logo. 

## Official Logo Direction
The final commercial logo must adhere to the following specifications:

### Core Motifs
The logo should subtly combine or suggest:
- **Shield/Security:** Protection, cybersecurity monitoring, safe boundaries.
- **Radar/RF Waves:** Outdoor wireless diagnostics, signal propagation, scanning.
- **Network Nodes:** Connectivity, operations, hybrid cloud topology.
- **Telemetry Pulse:** Live data, monitoring, active heartbeat.

### Design Requirements
- **Strong Silhouette:** Must be instantly recognizable by its shape alone.
- **Scalability:** Must remain legible at 16x16px (favicon) and scale cleanly to large boot splash screens.
- **Monochrome Compatibility:** Must work perfectly in single-color applications (pure white on black, or pure black on white) without relying on gradients or multiple colors for definition.
- **Originality:** Must be 100% original artwork. **Must NOT** resemble existing security company logos or networking vendor logos.
- **Format:** SVG primary format.

## Current Files
- `netsentinel-ai-logo-placeholder.svg`: An original, simple geometric vector acting as a placeholder until final commercial artwork is commissioned. **This is NOT the final logo.**

## Asset Conversion
To use the SVG placeholder in contexts requiring PNG (like GRUB or desktop launchers without SVG support), use `rsvg-convert` or `inkscape` to convert it safely without embedding proprietary tools:

```bash
# Using librsvg2-bin
rsvg-convert -h 1024 -o netsentinel-ai-logo.png netsentinel-ai-logo-placeholder.svg

# Using inkscape
inkscape -w 1024 -h 1024 netsentinel-ai-logo-placeholder.svg -o netsentinel-ai-logo.png
```
