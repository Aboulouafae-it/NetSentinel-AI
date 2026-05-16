# NetSentinel AI UI Design System

Status: v3.0 foundation  
Product stage: MVP / Work in Progress  
Design goal: Professional dark NOC/SOC interface with operational clarity first

## Design Principles

- Keep the interface serious, dense, and readable for repeated operational use.
- Use visual emphasis to clarify status, not to decorate the screen.
- Avoid fake activity, fake KPIs, and unsupported production claims.
- Every page must handle loading, error, empty, and success states.
- Inline explanations should be concise; detailed analysis belongs in drawers, reports, or AI panels.
- Use confidence states when data may be manual, inferred, stale, or adapter-derived.

## Color Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg-app` | `#05070A` | Main application background. |
| `--bg-base` | `#0B1220` | Panels and table bodies. |
| `--bg-surface` | `#111827` | Cards and elevated surfaces. |
| `--bg-surface-hover` | `#172033` | Hover and selected rows. |
| `--brand-cyan` | `#0EA5E9` | Technical highlights and live indicators. |
| `--brand-primary` | `#2563EB` | Primary actions and selected navigation. |
| `--status-critical` | `#DC2626` | Critical, down, high-risk states. |
| `--status-warning` | `#F59E0B` | Warning and degraded states. |
| `--status-online` | `#22C55E` | Healthy and online states. |
| `--text-primary` | `#E5E7EB` | Main text. |
| `--text-secondary` | `#CBD5E1` | Secondary text. |
| `--text-muted` | `#94A3B8` | Muted labels and metadata. |

## Typography

| Element | Guidance |
| --- | --- |
| Product shell | Inter or local system fallback. |
| Headings | Outfit or system sans, semibold, no negative letter spacing. |
| KPI values | Bold, compact, never oversized inside dense panels. |
| Tables | 12-14 px headers, 13-15 px row text, clear status badges. |
| Monospace | Use for IP addresses, route patterns, log fragments, and measurements. |

## Spacing

| Token | Value | Use |
| --- | --- | --- |
| `--spacing-xs` | `4px` | Tight icon/label gaps. |
| `--spacing-sm` | `8px` | Control grouping. |
| `--spacing-md` | `16px` | Standard component spacing. |
| `--spacing-lg` | `24px` | Section spacing. |
| `--spacing-xl` | `32px` | Page padding on desktop. |

## Cards and Panels

- Cards use 8px radius or less unless a local pattern requires otherwise.
- Avoid nested cards; use sections, rows, or drawers inside a card.
- Cards should not glow by default.
- Critical panels can use a colored top border or left rail.

## Tables

- Tables should be horizontally scrollable only when the data genuinely requires it.
- Headers use muted uppercase labels.
- Rows should support hover and selection states.
- Empty tables use `EmptyState`, not a blank card.
- Errors use `ErrorState` with a specific endpoint/workflow message.

## Drawers

Use a right-side analysis drawer for:
- Asset details.
- Alert evidence.
- Incident timeline and tasks.
- Wireless diagnosis evidence.
- AI summaries and confidence explanations.

Drawer rules:
- Keep the main table visible.
- Show source, timestamp, confidence, and next recommended action.
- Do not execute destructive actions from a drawer without confirmation.

## Badges

Severity states:

| State | Color | Meaning |
| --- | --- | --- |
| Critical | Red | Immediate operator attention. |
| High | Amber/red | Serious but not necessarily down. |
| Medium | Blue | Needs review. |
| Low | Slate | Informational or low risk. |

Health states:

| State | Color | Meaning |
| --- | --- | --- |
| Excellent | Green | No significant degradation. |
| Good | Green/cyan | Healthy with minor caution. |
| Degraded | Amber | Needs attention or trend review. |
| Poor | Orange | Service impact likely. |
| Critical | Red | Immediate field or operations action. |

Source confidence:

| State | Meaning |
| --- | --- |
| Supported | Direct measured or adapter-backed evidence. |
| Partial | Some evidence is inferred or incomplete. |
| Manual | Operator-entered or unverified input. |
| Unknown | Source is not available. |

## Loading, Empty, Error, and Success States

- Loading: use skeleton blocks or compact spinner rows with the exact workflow name.
- Empty: explain what is missing and how data normally appears.
- Error: state the failed operation; avoid stack traces in the UI.
- Success: confirm the action and any resulting status or next step.

## KPI Cards

KPI cards should show:
- Label.
- Current value from real data or `-` when unavailable.
- Small subtitle with source or scope.
- Optional status color.

Never show invented production metrics.

Dashboard Control Center KPI rules:

- Use `-`, `Awaiting data`, or `Not available yet` when a backend field is absent.
- Derive health labels only from available operational counts.
- Roadmap modules may appear as panels, but they must be visibly marked as planned or foundation status.
- Time filters must be labeled as pending until backend filtering is implemented.

## Control Center Panels

Control Center panels should be arranged around operator questions:

- Is the network healthy?
- Are any alerts or incidents urgent?
- Is wireless RF health measured or awaiting field data?
- Is syslog/security ingestion producing evidence?
- Are appliance services reachable?
- What changed recently?
- Which roadmap areas are visible but not active?

Panel rules:

- Every panel must either show real backend data or an explicit empty/unavailable state.
- No topology map should be drawn until real graph data exists.
- Cloud and AI panels must not imply active integrations before credentials, privacy controls, and provider configuration exist.

## Network Operations Panels

Network Operations panels should prioritize NOC triage:

- Asset state: total, online, offline, degraded, at-risk, and unmanaged/unknown.
- Polling state: last poll result, latency, packet loss, source, error, and timestamp where available.
- Discovery state: latest scan summary and history only; scans must be operator-initiated.
- Topology state: real counts and relationships only; no inferred graph until graph data exists.
- Network alerts: only real alert records linked to assets or network sources.

Details drawer rules:

- Show the selected device identity, IP, type, vendor, status, risk, last seen, polling metadata, and related alert count.
- Keep actions safe and scoped: Poll Now for one selected asset, links to alerts/logs/assets, and no automatic broad scans.
- Show unavailable fields as `Not available yet`, not as healthy or zero.

## Topology Panels

Topology panels should show:
- Site and link relationships from real inventory.
- Unknown nodes as unknown, not assumed.
- Link status, source, and last update.
- Future vendor overlays only after integrations exist.

## Wireless Metric Cards

Wireless cards should include:
- RSSI.
- SNR.
- Noise floor.
- CCQ.
- Latency.
- Packet loss.
- TX/RX capacity.
- Source confidence.
- Last measured timestamp.

RF metric card rules:

- Each metric must show a value, unit, and operational interpretation when the value exists.
- Missing values must show `-`, `Unavailable`, or `Manual RF data required`; do not silently omit the metric.
- Source confidence must be visible near RF summaries: Manual Verified, Adapter Partial, SNMP Basic, RF Metrics Missing, Fixture Validated, or Real Capture Pending.
- Deterministic root cause output must be labeled as rule-based, not AI-generated.
- Adapter-derived metrics must not be described as complete unless the adapter capability data explicitly supports it.

## SOC Incident Panels

SOC panels should include:
- Severity.
- Status.
- Linked alerts.
- Evidence timeline.
- Owner.
- Tasks.
- Notes.
- Audit trail when available.

## SOC Workspace Panels

SOC landing panels should stay evidence-first and non-destructive:

- Show alert severity distribution and lifecycle status from real alert records.
- Show syslog/Fortinet activity only when logs exist.
- Client-side summaries must be labeled as based on currently loaded events.
- Evidence drawers may show metadata, but secrets, tokens, passwords, credentials, authorization headers, and API keys must be redacted.
- Investigation playbooks may recommend manual verification and escalation, but must not imply automatic blocking, isolation, SOAR, EDR, XDR, or full SIEM support unless those systems are implemented.
- AI-ready panels must say no provider is configured and no external data leaves the appliance by default.

## AI Response Panels

AI panels must show:
- Evidence used.
- Confidence level.
- Boundaries and uncertainty.
- Human approval requirement before automation.
- Privacy state: local-only or external provider.

AI must not be presented as authoritative without supporting evidence.

## AI Copilot Foundation Panels

The v3.5 AI Copilot workspace uses local context and provider-disabled states only.

Panel rules:

- Provider state must be visible near the page header: provider not configured, external calls disabled, and local summaries only.
- Data source panels must distinguish available, partial, and future sources.
- Privacy risk labels must be shown for sources that may include logs, incidents, credentials, topology, hostnames, IP addresses, or operational notes.
- Local summaries must be labeled as rule-based or deterministic, not AI-generated.
- Disabled context selectors should explain why they are disabled, such as provider configuration, prompt preview, redaction, RBAC, and audit requirements.
- External prompt send controls must not be available until provider configuration, redaction enforcement, operator approval, and audit logging exist.
- No AI panel should display invented analysis, fake recommendations, or unsupported provider status.

## Cloud & Hybrid Foundation Panels

Cloud panels must remain strict about connector state and credential posture.

Panel rules:

- Header status must show roadmap/foundation state, no credentials configured, and external cloud calls disabled.
- Provider readiness cards must distinguish future support from active monitoring.
- If on-prem topology data is shown, the source must be an existing local endpoint and the cloud side must be labeled future/not imported.
- Cloud resource counts must not be invented. Use `Not imported`, `Future`, or `No connector configured` when data is absent.
- Public exposure, security group, VPN, cloud log, Kubernetes, and container security panels must be framed as planned checks until connectors exist.
- Tool profiles may be listed as documentation only; do not imply packages are installed.
- Credential panels must state no cloud secrets in ISO/source control and require encrypted vault, RBAC, organization scoping, and audit logging before activation.
- Cloud AI troubleshooting panels must reference the AI privacy model: no provider configured, no external calls, redaction required, and operator approval required.

## Reports and Export Panels

Report panels must distinguish readiness from generated artifacts.

Panel rules:

- Report cards must show `Available`, `Partial`, or `Planned` status.
- KPI values must come from real APIs or show planned/unavailable states.
- Export format panels must not imply files exist until a generation backend and download endpoint exist.
- Backup panels may display `/system/health` metadata, but restore actions must not be exposed without explicit backend safety workflows.
- Safe sharing panels must remind operators to redact secrets, identifiers, raw logs, packet captures, database dumps, SNMP communities, and cloud account IDs.
- Compliance/audit panels must avoid certification claims unless formal compliance evidence exists.
- Report generation flow should include preview, redaction, export, audit metadata, and optional scheduling only when backend support exists.
