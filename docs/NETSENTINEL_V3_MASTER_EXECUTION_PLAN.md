# NetSentinel AI v3.0 Master Execution Plan

Status: Strategic implementation plan  
Product stage: MVP / Work in Progress  
Scope: Product experience, UI architecture, module workflows, and platform readiness  
Explicitly out of scope for this phase: ISO build, live-build execution, release tagging, production claims

## Operating Principles

- NetSentinel AI must behave like a professional local-first network, security, wireless, and cloud operations platform.
- Product screens must prefer real backend state over demo counters or simulated production claims.
- Every operational page must expose loading, error, empty, and success states.
- Cloud and AI features must be introduced as controlled foundations before credentials, external providers, or automated actions are added.
- Appliance and ISO packaging remain final-stage work after the application experience is strong.

## Phase 1 - Product Experience Foundation

Objective: Establish a consistent operational shell and design foundation across the current MVP.

Deliverables:
- Shared design tokens for dark NOC/SOC interface.
- Unified navigation mapped to the final information architecture.
- Reusable page primitives: page shell, module header, KPI grid, analysis drawer, health badges, status pills, empty/error/loading states.
- Clear MVP language on roadmap pages.
- Removal of fake production positioning from visible product chrome.

Files likely affected:
- `frontend/src/app/globals.css`
- `frontend/src/components/ui.tsx`
- `frontend/src/components/Sidebar.tsx`
- `frontend/src/components/Sidebar.module.css`
- New roadmap placeholder pages under `frontend/src/app/`

Validation commands:
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- Secret scan over changed files.
- `git diff --stat`

Success criteria:
- Existing pages still render.
- Shared components compile.
- Navigation includes current modules plus safe roadmap placeholders.
- No ISO build or packaging command is run.

Blockers and risks:
- Some current pages still use inline styles and local layout patterns.
- Navigation grouping may need a later design pass to avoid crowding.
- Existing backend coverage may not validate every frontend route.

## Phase 2 - Operations Dashboard Upgrade

Objective: Turn the dashboard into the primary operator cockpit.

v3.1 implementation status: Foundation implemented in the frontend Control Center. The dashboard now uses current real dashboard endpoints for summary counts, wireless averages, recent activity, service status, and topology inventory. Cloud & Hybrid and AI Copilot are displayed only as roadmap-safe panels with no credentials, provider calls, or production claims.

Deliverables:
- Real KPIs from backend endpoints. Implemented for assets, alerts, incidents, wireless measurement availability, and service status.
- Real-time or near-real-time status refresh. Implemented through the existing live event hook and manual refresh action.
- Topology overview fed by sites/assets/links. Implemented as an inventory summary; graph visualization remains planned.
- Wireless health summary. Implemented from field measurement averages.
- Security summary. Implemented from exposed security event counters where present.
- Cloud foundation card with no credentials configured by default. Implemented as roadmap-only.
- Appliance health status. Implemented from `/dashboard/system-status`; disk and backup detail remain future.
- AI insight panel marked as evidence-based and non-authoritative. Implemented as roadmap-only with no provider configured.

Files likely affected:
- `frontend/src/app/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/types.ts`
- Backend dashboard routers and schemas.

Validation commands:
- Frontend build.
- Backend test suite.
- Manual API checks for dashboard endpoints.

Success criteria:
- No static production counters. v3.1 uses API data or honest unavailable states.
- Dashboard degrades gracefully when endpoints are empty. v3.1 includes loading, error, empty, and retry states.
- Operator can identify urgent work from one screen. v3.1 exposes network, wireless, security, incident, appliance, and activity panels.

Blockers and risks:
- Missing normalized event model.
- Backend may need new aggregation endpoints for topology, cloud, and appliance health.
- Time range selector is currently a UI placeholder; backend range filtering is not implemented.
- Wireless health is based on aggregate measurements, not full link-level health distribution.

## Phase 3 - Network Operations Module

Objective: Build a reliable network operations workspace around discovery, assets, polling, and topology.

v3.2 implementation status: Network Operations workspace foundation implemented at `/network`. The page uses real asset, alert, discovery, dashboard summary, and topology summary APIs. Topology remains summary-only; no graph is drawn or inferred.

Deliverables:
- Discovery execution and result review. Existing Discovery page remains the safe scan launch area; `/network` now shows scan history/status without starting scans automatically.
- Asset inventory workflows. `/network` provides a NOC overview and links to the existing Assets page.
- Topology foundation. Implemented as real sites/assets/wireless link summary only.
- Interface status model. Not implemented yet; requires backend interface data.
- Latency and loss tracking. Implemented where asset polling fields are present.
- SNMP polling foundation. Shown only through existing polling metadata; no unsupported SNMP claims.
- LLDP/CDP support planned but not claimed until implemented.
- Inventory risk classification. Displayed from existing asset risk fields.

Files likely affected:
- `frontend/src/app/assets/`
- `frontend/src/app/discovery/`
- `frontend/src/app/logs/`
- Backend asset, discovery, telemetry, and polling modules.

Validation commands:
- Backend tests for discovery and assets.
- Frontend build.
- Manual scan against a safe lab range.

Success criteria:
- Operators can inspect and poll individual network assets from a details drawer.
- Asset status is organization-scoped through existing backend APIs.
- Unsupported protocols are shown as unavailable or future, not as active features.
- Broad discovery scans are not started automatically from the overview.

Blockers and risks:
- Real network polling needs controlled timeouts and rate limits.
- Vendor parsing can become unreliable without source confidence metadata.
- Bulk polling exists in the backend but is not exposed in v3.2 to avoid accidental broad operations.
- Interface/SNMP/LLDP/CDP summaries need backend contracts before UI claims can expand.

## Phase 4 - Wireless Diagnostics Module

Objective: Make wireless diagnostics a serious field workflow for outdoor RF links.

v3.3 implementation status: Wireless Diagnostics Pro workspace implemented at `/wireless`. The workspace uses real wireless links, radio devices, field measurements, dashboard wireless health, and alert APIs. Manual field measurements are clearly distinguished from adapter-derived or missing RF data. Link detail now presents rule-based field diagnosis instead of an AI brief action.

Deliverables:
- Links and radio inventory. Implemented through `/wireless` and existing radio device pages.
- Field measurement capture. Existing flow remains linked and surfaced in the workspace.
- RF health scoring. Implemented from deterministic `FieldMeasurement.diagnosis`.
- Source confidence for manual, adapter, and telemetry-derived readings. Implemented as Manual Verified, Adapter Partial, SNMP Basic, RF Metrics Missing, and Real Capture Pending labels.
- Interference and alignment triage. Implemented as static field guidance plus deterministic diagnosis evidence/actions.
- Workflows for PowerBeam, TP-Link, MikroTik, and Ubiquiti where supported. Vendor labels are shown only from existing device metadata; unsupported adapter capabilities remain explicit.
- Real capture validation later, not as a v3.3 claim.

Files likely affected:
- `frontend/src/app/wireless/`
- `frontend/src/app/radio-devices/`
- `frontend/src/app/field-measurements/`
- `frontend/src/app/diagnostics/`
- Backend wireless, diagnostics, radio device, and alert modules.

Validation commands:
- Wireless diagnostics unit tests.
- Field measurement integration tests.
- Frontend build.

Success criteria:
- A technician can enter real RF readings and see deterministic triage in workspace and link detail.
- Poor or critical measurements create alert records through existing backend logic.
- Recommendations remain explainable and rule-based, with evidence where the backend returns it.
- Missing RF fields are displayed instead of hidden.

Blockers and risks:
- Vendor live adapters require lab hardware validation.
- RF diagnosis depends on link context, not metrics alone.
- Link-level health distribution currently depends on latest manual measurements; backend link health aggregation would make this stronger.
- Automatic RF metrics are partial and adapter-dependent; the UI must continue to avoid claiming full vendor support.

## Phase 5 - Security / SOC Module

Objective: Build a practical local-first SOC workflow.

v3.4 implementation status: Security Operations Center workspace implemented at `/security`. The page uses real alerts, incidents, logs, dashboard security counters, detection rules, and IOCs. It presents syslog/Fortinet activity, event classification, alert lifecycle, incident queue, scrubbed evidence drawer, and a safe investigation playbook. It does not claim full SIEM, EDR, XDR, SOAR, or external threat intelligence support.

Deliverables:
- Syslog ingestion foundation. Surfaced through currently loaded log events and security categories.
- Fortinet profile support where implemented and clearly scoped. Fortinet categories are displayed only when present in log metadata.
- Alert lifecycle. Displayed from real alert statuses.
- Incident timeline. Incidents are surfaced in queue; detailed editing remains on the Incidents page.
- Evidence drawer. Implemented for selected alerts, incidents, and logs with compact scrubbed metadata.
- Analyst review workflow. Implemented as a non-destructive investigation playbook.
- AI incident summary as future capability behind safety controls. Shown as future/no-provider; no external calls.

Files likely affected:
- `frontend/src/app/security/`
- `frontend/src/app/alerts/`
- `frontend/src/app/incidents/`
- `frontend/src/app/logs/`
- Backend log, rule, IOC, alert, and incident modules.

Validation commands:
- Security rule tests.
- IOC matching tests.
- Incident workflow tests.
- Frontend build.

Success criteria:
- Analysts can inspect log, alert, and incident evidence from the SOC landing page.
- Rules and IOCs remain loaded from existing organization-scoped APIs.
- No destructive response action, auto-block, or isolation workflow is exposed.

Blockers and risks:
- Syslog volume can overload the MVP without ingestion controls.
- RBAC and audit logs must mature before enterprise use.
- SOC summaries are based on current dashboard counters and currently loaded logs, not a full SIEM index.
- Threat intelligence integrations are not implemented and should remain out of scope until credential and source policies exist.

## Phase 6 - Cloud & Hybrid Module

Objective: Prepare a cloud operations area without collecting credentials by default.

v3.6 implementation status: Cloud & Hybrid Foundation workspace implemented at `/cloud-hybrid`. The page presents provider readiness for AWS, Azure, Google Cloud, Cloudflare, Kubernetes, and container security; hybrid topology planning with real on-prem topology counts where available; VPN tunnel, public exposure, cloud logs, AI troubleshooting, tool profile, and credential safety panels. It does not collect credentials, import cloud inventory, install tools, or call external provider APIs.

Deliverables:
- Cloud overview placeholder. Upgraded into a professional foundation workspace.
- AWS, Azure, GCP, and Cloudflare roadmap. Implemented as provider readiness cards with explicit not-configured status.
- Kubernetes and container security future scope. Documented in the workspace as future only.
- Cloud inventory data model. Still future; workspace describes intended domains without storing records.
- VPN tunnel health foundation. Implemented as planned check model only; no connector configured.
- Public exposure checks. Implemented as roadmap panel only; no cloud scanning.
- Security group/firewall checks. Implemented as roadmap checks only.
- Hybrid topology concept. Implemented with real on-prem topology counts from the existing dashboard topology endpoint and future cloud-side placeholders.
- Clear no-credentials-by-default posture. Implemented in UI and documentation.

Files likely affected:
- `frontend/src/app/cloud-hybrid/`
- Future backend cloud modules.
- Documentation under `docs/`.

Validation commands:
- Frontend build.
- Secret scan.
- Manual review of no external API calls.

Success criteria:
- Cloud is visible in the product architecture without pretending integrations exist.
- v3.6: No cloud secrets, tokens, API keys, SDKs, CLIs, or credentials are introduced.
- v3.6: No external provider API calls are made.
- v3.6: Cloud inventory, logs, security findings, and tunnel status remain clearly marked as future/not configured.

Blockers and risks:
- Cloud connectors need a secure credentials vault and audit model first.
- Provider activation requires RBAC, encrypted credential profiles, organization scoping, rate limits, connector tests, and audit logs.

## Phase 7 - AI Copilot

Objective: Create a safe AI assistance foundation for troubleshooting and analysis.

v3.5 implementation status: AI Copilot Foundation workspace implemented at `/ai-copilot`. The page surfaces local context availability for alerts, incidents, logs, wireless measurements, radio devices, assets, polling status, and appliance health. It displays rule-based summaries only when existing local records provide evidence. No provider is configured, no external AI calls are made, and no automated remediation is exposed.

Deliverables:
- Provider abstraction. Documented as a future architecture; disabled by default.
- Privacy controls. Implemented in the workspace as explicit provider status, external-call-disabled labels, data source risk labels, and disabled context selection controls.
- Local versus external AI policy. Documented in `docs/AI_COPILOT_PRIVACY_AND_PROMPT_SAFETY.md`.
- Alert explanation. Foundation only; real alert context is surfaced, but no AI explanation is generated.
- Wireless degradation explanation. Rule-based summaries use existing deterministic field measurement diagnosis when present.
- Incident summarization. Foundation only; open incident timeline/task counts are surfaced locally when records exist.
- Recommended troubleshooting steps. Displayed only as local deterministic/module guidance, not provider output.
- Field technician checklist. Future provider/local model task; not generated in v3.5.

Files likely affected:
- `frontend/src/app/ai-copilot/`
- `docs/AI_COPILOT_PRIVACY_AND_PROMPT_SAFETY.md`
- `docs/AI_PROVIDER_ARCHITECTURE.md`
- Backend AI assistant endpoints in future phases only.
- Privacy and safety documentation.

Validation commands:
- Frontend build.
- Backend AI endpoint tests when modified; not required for v3.5 because backend code is unchanged.
- Prompt-injection safety review.

Success criteria:
- v3.5: No fake AI responses are displayed.
- v3.5: Local summaries are labeled as rule-based, not AI-generated.
- v3.5: No sensitive data leaves the appliance because no provider calls are exposed.
- Future: AI responses must be evidence-based, scoped, and labeled with confidence.
- Future: Human approval is required before automation.

Blockers and risks:
- Hallucination, prompt injection, and data leakage must be controlled.
- Provider configuration requires RBAC, organization scoping, redaction enforcement, prompt preview, rate limits, and audit logging before external AI use is acceptable.

## Phase 8 - Reports / Backup / Compliance

Objective: Provide exportable operational records and appliance recovery workflows.

v3.10 implementation status: Reports & Export Center foundation implemented at `/reports`. The workspace uses existing dashboard, wireless health, recent activity, and appliance health APIs to show report readiness and backup metadata. Report generation, downloads, scheduled jobs, compliance evidence, and restore actions remain planned until backend rendering, redaction, audit, RBAC, and safe restore workflows exist.

Deliverables:
- PDF/HTML reports. Future; v3.10 documents format readiness without generating files.
- CSV/JSON exports. Future; no download endpoints exposed.
- Scheduled reports. Future; no scheduler added.
- Backup and restore UI. Backup metadata surfaced through `/system/health`; destructive restore action is intentionally not exposed.
- Audit trail. Future prerequisite for report generation/downloads.
- Export center. Foundation implemented with planned formats and safety notes.
- Compliance notes and evidence references. Foundation implemented without formal compliance claims.

Files likely affected:
- `frontend/src/app/reports/`
- Backup/restore backend endpoints.
- Documentation.

Validation commands:
- Report generation tests.
- Backup restore test in lab environment.
- Frontend build.

Success criteria:
- v3.10: Reports distinguish available data, partial readiness, and planned capabilities.
- v3.10: No fake report counts or downloadable files are created.
- v3.10: No destructive restore workflow is exposed from the UI.
- Future: Reports distinguish measured facts, inferred diagnosis, and recommendations.
- Future: Backups are restorable and do not expose secrets unnecessarily.

Blockers and risks:
- Backup encryption and restore validation are required before production claims.
- Report exports require redaction, organization scoping, audit logging, retention policy, and download access controls.

## Phase 9 - Appliance Experience

Objective: Add professional appliance behavior after the UI is strong.

Deliverables:
- Auto-start services.
- Kiosk/direct console.
- Local control center.
- Persistence/install mode.
- Hardening.

Files likely affected:
- `deploy/live-image/`
- `desktop-client/`
- Appliance documentation.

Validation commands:
- Shell syntax checks.
- Live-image check-only validation.
- VM boot test after product readiness.

Success criteria:
- Operator sees NetSentinel AI console without typing localhost.
- Console fallback remains available.
- No vendor OS branding is presented as product identity.

Blockers and risks:
- Kiosk and persistence are packaging concerns and should not distract from product workflow gaps.

## Phase 10 - ISO / Appliance Packaging

Objective: Package the validated product as a branded appliance image.

Deliverables:
- Final ISO build.
- VMware/QEMU validation.
- Persistence test.
- Release artifacts.
- Checksum.
- Screenshots.

Files likely affected:
- `deploy/live-image/`
- `docs/ISO_VM_BOOT_TEST.md`
- `docs/REAL_ISO_BUILD_TEST.md`
- Release documentation.

Validation commands:
- `./build-live-prototype.sh --check-only`
- ISO build only in final packaging phase.
- VM boot validation.
- Secret and forbidden payload scan.

Success criteria:
- ISO boots as NetSentinel AI OS.
- Product interface is strong enough to justify packaging.
- Release artifacts are reproducible and checksummed.

Blockers and risks:
- Premature ISO iteration can hide core product gaps.

## Recommended Next Task Sequence

1. v3.1 Dashboard Experience Upgrade
2. v3.2 Network Topology & Asset Operations
3. v3.3 Wireless Diagnostics Pro Workspace
4. v3.4 Security Operations Center Workspace
5. v3.5 AI Copilot Foundation
6. v3.6 Cloud & Hybrid Foundation
7. v3.10 Reports & Backup Center
8. v3.11 Desktop ISO Rebuild Preparation & Preflight Checklist
9. v3.12 Persistence / Install Mode Planning
10. v4.0 ISO Packaging & Release Candidate
