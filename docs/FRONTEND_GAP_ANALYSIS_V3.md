# NetSentinel AI Frontend Gap Analysis v3

Status: Current frontend audit against v3 target experience  
Product stage: MVP / Work in Progress

## Summary

The current frontend has a real Next.js application shell, authentication flow, a dark operational theme, and multiple pages already wired to backend endpoints. The main gaps are consistency, workflow completion, role-aware navigation, stronger empty/error states, and evidence-rich operator detail views. The product should avoid further ISO packaging work until the application experience is stronger.

## Page Audit

| Page | Current status | Visual quality | Data wiring | Missing UI states | Missing workflows | Priority | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Login | Exists | Good MVP | Auth API | API unavailable detail | Password reset, lockout messaging | High | Harden auth UX and failure messages. |
| Setup | Exists | Good MVP | Setup API | Retry and validation polish | First-run security guidance | High | Add validation summary and safe defaults. |
| Dashboard | Exists / v3.1 foundation | Strong Control Center foundation | Real dashboard endpoints | Standardized loading, error, empty, and retry states | Time-range filtering, topology graph, link-level wireless health, richer appliance health | Very high | Continue with v3.2 network topology and asset operations. |
| Network Overview | Exists / v3.2 foundation | Strong NOC foundation | Real assets, alerts, discovery, dashboard summary, topology summary | Standardized loading/error/empty states | Graph topology, interface model, SNMP summary, bulk polling controls | Very high | Continue with topology and asset operations in later v3.x work. |
| Assets | Exists / partial | Functional | Real asset API | Good loading/error/empty baseline | Add/edit, detail activity, history | Very high | Keep as detailed inventory page; align drawer patterns over time. |
| Alerts | Exists / partial | Functional | Real alert API | Needs standard components | Evidence drawer, filters, timeline | Very high | Build SOC-style alert lifecycle workspace. |
| Incidents | Exists / partial | Functional | Real incident API | Needs consistent empty/error | Timeline, ownership, task UX | Very high | Build incident detail/timeline model. |
| Logs | Exists / partial | Mixed | Real log API where available | Needs normalized error/empty states | Syslog source filters and parsing evidence | High | Turn logs into searchable evidence workspace. |
| Agents | Exists / partial | Functional | Real agent API | Needs stronger token handling UI | Trust status, rotation audit | Medium | Improve agent lifecycle and security copy. |
| Radio Devices | Exists / partial | Functional | Real radio API | Needs adapter failure states | Vendor adapter status and evidence | High | Add source confidence and adapter scope. |
| Wireless Links | Exists / v3.3 foundation | Strong wireless workspace | Real wireless, radio, measurements, alerts, dashboard wireless APIs | Professional empty/error/loading states on landing page | Link lifecycle, health trends, backend aggregation | Very high | Continue later with link health history and exportable reports. |
| Field Measurements | Exists / partial | Good MVP | Saves through API | Has validation and messages | Better form grouping, evidence drawer, mobile layout | Very high | Keep creation flow stable; align visual details incrementally. |
| Diagnostics | Exists / partial | Functional | Diagnosis endpoint | Needs error detail and loading polish | Report export, evidence trail, confidence | Very high | Convert to report-quality diagnostics workspace after wireless landing stabilizes. |
| Discovery | Exists / partial | Functional | Discovery API | Needs job progress clarity | Result review and asset promotion | High | Add scan lifecycle and topology handoff. |
| Security | Exists / v3.4 foundation | Strong SOC landing workspace | Real alerts, incidents, logs, dashboard security counters, rules, IOCs | SOC-level loading/error/empty states | Full SIEM indexing, RBAC/audit depth, rule editor, external threat intel | High | Continue later with dedicated SOC subpages and audit trail. |
| Automation | Exists / partial | Basic | Playbooks/actions APIs | Needs standardized errors | Human approval mode, safe execution review | Medium | Keep scoped until audit/RBAC improve. |
| Appliance Status | Exists / partial | Functional | System APIs | Needs service-level empty/error states | Backup, update, persistence states | Medium | Expand only after product workspace improves. |
| Cloud & Hybrid | Exists / v3.6 foundation | Strong roadmap foundation | Existing on-prem topology summary only; no external cloud calls | Clear no-credentials/no-connector states | Credential vault, provider connectors, cloud inventory, tunnel health, cloud logs, exposure scanning | Medium | Build credential architecture and read-only connector model before any provider integration. |
| AI Copilot | Exists / v3.5 foundation | Strong privacy-first foundation | Real local context APIs; no provider calls | Loading/error states for local context sources | Provider abstraction, prompt preview, audit trail, evidence citations, local/external provider modes | Medium | Continue later with provider abstraction only after RBAC/redaction/audit controls. |
| Reports | Exists / v3.10 foundation | Strong report/export foundation | Real dashboard, wireless health, recent activity, and appliance health APIs | Loading/error states for report source readiness | Report generation backend, exports, scheduler, redaction service, audit trail | Medium | Build report renderer and export audit model after core workspaces stabilize. |

## Cross-Cutting Gaps

| Gap | Impact | Recommended fix |
| --- | --- | --- |
| Flat navigation | Operators cannot easily map pages to product areas. | Introduce grouped IA gradually while keeping current routes. |
| Inline styles across pages | Slower UI consistency work. | Move common layout patterns into shared components. |
| Missing right-side evidence drawer pattern | Operators lose context when moving between list and detail views. | Use `AnalysisDrawer` for assets, alerts, incidents, diagnostics. |
| Inconsistent loading and error text | Pages feel less reliable under API failures. | Standardize `LoadingSkeleton`, `ErrorState`, and `EmptyState`. |
| Limited source confidence model | Manual, inferred, and adapter data can look equally authoritative. | Add `SourceConfidenceBadge` across wireless, radio, and diagnostics. |
| Future modules invisible | Cloud/AI roadmap lacks product placement. | Add non-invasive placeholders with strict limitations. |

## v3.1 Dashboard Upgrade Record

The dashboard has been upgraded into the NetSentinel AI Control Center foundation. It uses the current real dashboard APIs:

- `/dashboard/summary`
- `/dashboard/wireless-health`
- `/dashboard/recent-activity`
- `/dashboard/system-status`
- `/dashboard/topology-summary`

Real-data cards:

- Network health derived from asset, alert, and incident counts.
- Online assets and total asset status.
- Active alerts and critical/high alert counts.
- Open incidents.
- Wireless measurement availability and RF averages.
- Security/syslog summary where exposed by the backend.
- Appliance/service status from the dashboard system-status endpoint.
- Recent activity from real activity, alert, incident, log, measurement, and polling sources.
- Topology inventory summary from real sites, assets, and wireless links.

Roadmap-only cards:

- Cloud & Hybrid: no credentials configured, no external provider calls.
- AI Copilot: no provider configured, no external calls, future evidence-based assistance only.

Remaining dashboard gaps:

- Time range selector is a placeholder until backend range filtering is added.
- Topology graph is planned; current view is inventory summary only.
- Wireless health distribution needs link-level score data from the backend.
- Appliance disk and backup status should be integrated from the appliance health endpoint in a later pass.

## Immediate v3.2 Recommendation

The v3.2 Network Operations workspace has been added at `/network`.

Real APIs used:

- `/assets/?limit=200`
- `/alerts/`
- `/discovery/scans`
- `/dashboard/summary`
- `/dashboard/topology-summary`
- `/assets/{id}/poll` for selected-asset Poll Now

Implemented panels:

- Network KPI row for total, online, offline, at-risk/degraded assets, network alerts, and recently polled assets.
- Assets overview with status, risk, type, and vendor distributions.
- Topology summary from sites, assets, and wireless link counts.
- Polling and reachability summary from asset polling metadata.
- Discovery status from scan history.
- Asset-linked network alerts.
- Asset inventory table with selected-device details drawer.

Remaining gaps:

- Topology graph remains planned and is not drawn.
- Interface and SNMP summaries require backend interface contracts.
- Bulk polling is intentionally not exposed from the overview.
- Asset creation/editing and detailed activity history remain inventory-page follow-up work.

## Immediate v3.3 Recommendation

The v3.3 Wireless Diagnostics Pro workspace has been added at `/wireless`.

Real APIs used:

- `/wireless/links`
- `/radio-devices/`
- `/field-measurements/`
- `/dashboard/wireless-health`
- `/alerts/`
- `/wireless/links/{id}`
- `/wireless/links/{id}/metrics`
- `/wireless/links/{id}/measurements`

Implemented panels:

- Wireless KPI row for links, healthy/degraded/critical status, radio online/offline status, measurements, and wireless alerts.
- Link Health Overview with latest manual measurement values, missing RF fields, health score, severity, near/far radio labels, and source confidence.
- Rule-Based Diagnosis panel using deterministic field measurement diagnosis.
- Radio Devices summary with vendor distribution, online/offline counts, adapter status, and missing RF metrics.
- Latest Field Measurements panel.
- Wireless Alerts panel filtered from real alert records.
- Field guidance for interference, alignment, noise floor, CCQ, latency, and missing RF data.
- Link detail page now shows a deterministic rule-based field brief instead of an AI brief action.

Remaining gaps:

- Link-level health distribution still needs a backend aggregation endpoint.
- Automatic RF data depends on adapter snapshots and should remain partial until validated.
- Real capture validation and vendor-specific support matrices remain future work.
- Diagnostics report export remains future work.

## Immediate v3.4 Recommendation

The v3.4 Security Operations Center workspace has been added at `/security`.

Real APIs used:

- `/alerts/`
- `/incidents/`
- `/logs/?page=1&size=50`
- `/dashboard/summary`
- `/security/rules`
- `/security/iocs`

Implemented panels:

- SOC KPI row for active alerts, critical/high alerts, open incidents, loaded syslog events, Fortinet events, VPN/admin failures, and IPS/malware/web-filter categories.
- Threat/alert severity overview.
- Alert lifecycle status.
- Syslog and Fortinet activity panel.
- Client-side classification summary clearly labeled as based on currently loaded events.
- Incident queue panel.
- Active alert evidence panel.
- Rules and IOC summary.
- Investigation evidence drawer with scrubbed metadata.
- Safe, non-destructive investigation playbook.
- AI-ready placeholder with no provider configured and no external data transfer.

Remaining gaps:

- Not a full SIEM index; summaries are based on existing dashboard counters and current log page.
- No external threat intelligence integrations.
- No SOAR automation, auto-blocking, or endpoint isolation.
- Dedicated rule editor, audit trail, and RBAC expansion remain future work.

## Immediate v3.5 Recommendation

The v3.5 AI Copilot Foundation workspace has been added at `/ai-copilot`.

Real local APIs used:

- `/alerts/`
- `/incidents/`
- `/logs/?page=1&size=30`
- `/field-measurements/`
- `/radio-devices/`
- `/assets/?limit=100`
- `/system/health`

Implemented panels:

- Privacy and provider status panel with no provider configured and external calls disabled.
- AI-ready data source overview for alerts, incidents, logs, wireless measurements, radio metrics, network assets, polling status, cloud/hybrid future, and appliance health.
- Local troubleshooting cards for alert explanation, incident summary, wireless troubleshooting, network reachability, syslog/Fortinet event interpretation, and cloud/VPN future.
- Rule-based local summary panel that uses existing alert evidence, wireless diagnosis, incident counts, log categories, and asset polling metadata when available.
- Disabled context selection design for future selected alert, incident, wireless link, asset, and log event workflows.
- Prompt safety and redaction policy summary.

Documentation created:

- `docs/AI_COPILOT_PRIVACY_AND_PROMPT_SAFETY.md`
- `docs/AI_PROVIDER_ARCHITECTURE.md`

Remaining gaps:

- No provider registry is implemented.
- No external provider calls are made.
- No prompt preview, audit log, RBAC policy, or redaction enforcement service exists yet.
- No AI-generated explanation, checklist, or remediation is displayed.

## Immediate v3.6 Recommendation

The v3.6 Cloud & Hybrid Foundation workspace has been added at `/cloud-hybrid`.

Real local API used:

- `/dashboard/topology-summary` for on-prem site, asset, and wireless link counts only.

Implemented panels:

- Provider readiness for AWS, Azure, Google Cloud, Cloudflare, Kubernetes future, and container security future.
- Hybrid topology foundation with real on-prem topology counts and future cloud-side placeholders.
- VPN tunnel health roadmap.
- Public exposure and cloud firewall/security group roadmap.
- Cloud logs and security events roadmap.
- AI-assisted cloud troubleshooting future panel with no provider configured.
- Optional tool profile summary for documentation only.
- Safe credential posture panel covering no credentials in ISO/source, encrypted vault prerequisite, organization scoping, and audit requirements.

Remaining gaps:

- No cloud credentials are collected or stored.
- No external cloud APIs are called.
- No cloud inventory, cloud logs, VPN health, exposure findings, or cloud security findings are imported.
- No cloud SDKs, CLIs, or scanner packages are installed.
- Credential vault, RBAC, audit logging, connector tests, and provider data models remain future work.

## Immediate v3.10 Recommendation

The v3.10 Reports & Export Center workspace has been added at `/reports`.

Real APIs used:

- `/dashboard/summary`
- `/dashboard/wireless-health`
- `/dashboard/recent-activity?limit=30`
- `/system/health`

Implemented panels:

- Report Overview with Network, Wireless Diagnostics, Security Operations, Incident, Cloud & Hybrid future, and Appliance Health report cards.
- Report readiness KPIs based on real operational counts and appliance backup metadata.
- Export Center foundation for PDF, HTML, CSV, JSON, and backup bundle future states.
- Backup & Restore Status panel using appliance health where available and documenting script-based backup/restore posture.
- Report Generation Design panel.
- Safe Sharing Policy panel.
- Compliance / Audit future panel.

Remaining gaps:

- No report renderer or template backend exists.
- No downloadable files are generated.
- No scheduled jobs are added.
- No destructive restore action is exposed from the UI.
- Redaction service, audit log, organization-scoped export access, retention policy, and report download endpoints remain future work.

## Immediate v3.11 Recommendation

Prepare the Desktop ISO Rebuild Preflight Checklist next. Keep the source tree in no-kiosk desktop appliance mode and do not build ISO until preflight passes.
