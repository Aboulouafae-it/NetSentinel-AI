# NetSentinel AI Web UI Visual Refinement Guide

**Version:** v2.7 Planning
**Status:** Design Specification

This document details how the Next.js web UI must align visually with the broader NetSentinel AI OS identity.

## 1. General Aesthetic
- **Dark NOC/SOC Look:** The interface must use the established color palette (Deep Black `#05070A`, Dark Navy `#0B1220`). It should look at home on a wall-mounted monitor in a Network Operations Center.
- **Professional Headers:** Page headers should be clean, using sans-serif typography, with a clear indication of context (e.g., breadcrumbs or strong titles).
- **Operational Clarity First:** Function dictates form. Do not sacrifice data density for whitespace if it harms usability.

## 2. Components
- **KPI Cards:** Must be consistent in padding, font sizes, and border radius across the dashboard.
- **Status Badges:** Use strict semantic coloring.
  - `Up/Healthy`: Green (`#22C55E`)
  - `Degraded/Warning`: Yellow (`#EAB308`)
  - `Down/Critical`: Red (`#DC2626`)
  - `Unknown/Unmonitored`: Gray (`#94A3B8`)
- **Source Confidence Badges:** Clearly display the origin of telemetry (e.g., `adapter:validated`, `manual`). Use muted colors to avoid competing with health status.
- **Wireless Health Gauge:** A deterministic visual representation of RF health based on RSSI/SNR/CCQ.
- **Cloud/Hybrid Future Cards:** Future UI elements for cloud topology must blend seamlessly with on-premise elements, differentiated only by subtle icons (e.g., a small cloud glyph).

## 3. Prohibited UI Patterns
- **No Fake Dashboards:** Do not pad the interface with meaningless gauges, stock charts, or randomized data to make it look "busy". If there is no data, display a clean empty state.
- **No Marketing Exaggeration:** Use objective language. A down link is "Offline", not a "Catastrophic Failure".
- **No Over-Animation:** Avoid bouncy page transitions or long fade-ins. Hover states should be snappy (<= 150ms).
