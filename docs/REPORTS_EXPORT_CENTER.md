# NetSentinel AI Reports, Backup & Export Center

Status: v3.10 foundation implemented  
Product stage: MVP / Work in Progress  
Scope: Report workspace, export planning, backup/restore safety posture, and redaction policy

## Current Implementation

The Reports & Export Center exists at `/reports` as a professional foundation workspace.

Current real data sources:

- `/dashboard/summary`
- `/dashboard/wireless-health`
- `/dashboard/recent-activity?limit=30`
- `/system/health`

The workspace uses these sources to show current report readiness, operational counts, wireless measurement availability, appliance health, disk metadata, and backup metadata where exposed by the backend.

## Report Types

| Report | Current availability | Current sources | Export status |
| --- | --- | --- | --- |
| Network Report | Partial when assets exist | Dashboard summary, Network Operations, Asset inventory | Planned |
| Wireless Diagnostics Report | Partial when measurements exist | Wireless health summary, field measurements, Wireless Diagnostics | Planned |
| Security Operations Report | Partial when alerts/security counters exist | Dashboard summary, Security Operations, logs, alerts, incidents | Planned |
| Incident Report | Partial when incidents exist | Incidents, alert lifecycle records | Planned |
| Cloud & Hybrid Report | Planned | Cloud & Hybrid foundation only | Future |
| Appliance Health Report | Partial when `/system/health` loads | System health, disk, agents, backup metadata | Planned |

No downloadable report files are generated in v3.10.

## Export Formats

Planned export formats:

- PDF for formal printable reports.
- HTML for browser-previewable report bundles.
- CSV for tabular exports.
- JSON for machine-readable support/integration bundles.
- Backup bundle status through appliance scripts.

These formats require a backend generation pipeline, redaction controls, export audit metadata, and safe file handling before they should be exposed as download actions.

## Backup and Restore Safety

Current script foundation:

- `scripts/backup.sh`
- `scripts/restore.sh`

Important runtime paths:

- `/opt/netsentinel/backups`
- `/opt/netsentinel/reports`
- `/var/lib/netsentinel`
- `/var/log/netsentinel`

The `/system/health` endpoint exposes backup metadata when backup archives are present in the configured backup directory.

The v3.10 UI does not expose a restore button. Restore remains operator-controlled from the command line because restore can replace the current PostgreSQL database and persistent state.

## Safe Sharing Policy

Reports and exports must not leak secrets or sensitive operational context.

Before external sharing:

- Remove tokens, passwords, API keys, cookies, authorization headers, and credential values.
- Remove `.env` and `.env.production` content.
- Redact SNMP communities and radio/cloud credentials.
- Redact customer names, site names, public/private IPs, hostnames, and cloud account identifiers when needed.
- Scrub raw logs and incident notes.
- Do not include database dumps or raw packet captures in customer-facing report exports.

## Planned Report Generation Flow

Future report generation should follow this flow:

1. Select report type.
2. Select time range.
3. Choose report sections.
4. Preview the report.
5. Redact sensitive fields.
6. Export PDF, HTML, CSV, or JSON.
7. Optionally schedule report generation after scheduler support exists.

Scheduling is not implemented in v3.10.

## Backend Work Still Required

Future implementation needs:

- Report template registry.
- Server-side report renderer.
- Export file storage and retention policy.
- Redaction service.
- Audit log for report generation and downloads.
- Organization-scoped export access checks.
- Time-range filters on source APIs.
- Report download endpoints.
- Optional scheduler with safe retention and delivery controls.

## Production Readiness Boundary

The v3.10 workspace improves product structure and operator clarity. It does not make reporting production-ready. Formal reporting, compliance evidence, export packages, and backup/restore UI workflows require backend generation, audit, RBAC, redaction, restore validation, and storage hardening.
