# NetSentinel AI Information Architecture

Status: Target architecture with current MVP mapping  
Product stage: MVP / Work in Progress

## Navigation Model

NetSentinel AI should organize the product around operator intent instead of implementation modules. The final top-level areas are:

1. Control Center
2. Network Operations
3. Wireless Diagnostics
4. Security Operations
5. Cloud & Hybrid
6. AI Copilot
7. Reports
8. System / Appliance

## Implementation Status Legend

| Status | Meaning |
| --- | --- |
| Exists | Page or route exists in the current frontend. |
| Partial | Page exists but workflows, visual polish, or data wiring need work. |
| Future | Planned product area; should not claim real capability yet. |
| Do not implement yet | Requires architecture, security, credentials, or hardware validation first. |

## 1. Control Center

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Overview | `/` | Exists / Partial | Current dashboard uses backend endpoints and should become the operator cockpit. |
| Health | `/admin/appliance` | Exists / Partial | Appliance status route exists; should evolve into health workspace. |
| Recent Activity | `/` | Partial | Dashboard includes recent activity; dedicated activity view is future. |
| Quick Actions | `/` | Future | Should expose safe operator actions only. |

## 2. Network Operations

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Dashboard | `/` | Partial | Network summary belongs on the main operations dashboard. |
| Network Overview | `/network` | Exists / v3.2 foundation | NOC-style landing page for assets, polling, discovery status, topology summary, and network alerts. |
| Assets | `/assets` | Exists / Partial | Uses API calls; add create/edit workflows and stronger details. |
| Discovery | `/discovery` | Exists / Partial | Needs scan lifecycle polish and result handling. |
| Topology | Future route | Future | Do not fake topology; build from sites/assets/links. |
| Interfaces | Future route | Future | Requires interface polling model. |
| Polling | Asset details / future | Partial | Asset poll action exists; needs scheduler and history. |
| Logs | `/logs` | Exists / Partial | Needs ingestion source clarity and filters. |

## 3. Wireless Diagnostics

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Wireless Overview | `/wireless` | Exists / v3.3 foundation | Wireless Diagnostics Pro workspace for links, RF measurements, radio status, source confidence, alerts, and field guidance. |
| Links | `/wireless`, `/wireless/links/[id]` | Exists / Partial | Needs richer link lifecycle and confidence states. |
| Radio Devices | `/radio-devices` | Exists / Partial | Live adapters must remain clearly scoped. |
| Field Measurements | `/field-measurements` | Exists / Partial | Saves measurements and shows deterministic diagnosis; needs UX refinement. |
| Alignment | Future route | Future | Requires measured alignment workflow. |
| Interference | Future route | Future | Requires spectrum/noise evidence or manual evidence model. |
| Diagnostics Reports | `/diagnostics` | Exists / Partial | Needs report export and evidence trail. |

## 4. Security Operations

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Security Overview | `/security` | Exists / v3.4 foundation | SOC landing workspace for alerts, incidents, syslog/Fortinet events, evidence drawer, rules, IOCs, and investigation workflow. |
| Syslog | `/logs` / future | Partial | Syslog profile and parsing need dedicated UX. |
| Fortinet | Future route | Future | Only expose when Fortinet parsing is validated. |
| Alerts | `/alerts` | Exists / Partial | Lifecycle actions are present; needs evidence drawer. |
| Incidents | `/incidents` | Exists / Partial | Needs timeline, tasks, ownership, and linked evidence. |
| Threat Intel | Future route | Future | Do not implement external feeds without source and update policy. |
| Forensics | Future route | Do not implement yet | Requires retention, chain-of-custody, and audit design. |

## 5. Cloud & Hybrid

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Cloud Overview | `/cloud-hybrid` | Exists / v3.6 foundation | Provider readiness, hybrid topology foundation, VPN/exposure/logs roadmap, safe credential posture; no credentials or external calls. |
| Accounts | Future route | Do not implement yet | Requires encrypted credential storage and RBAC. |
| VPC/VNet Inventory | Future route | Future | Requires provider connectors. |
| VPN Tunnels | Future route | Future | Could start with manual or device-derived tunnel health. |
| Public Exposure | Future route | Future | Requires careful scanning boundaries. |
| Cloud Security Findings | Future route | Future | Requires provider-specific models. |
| Hybrid Topology | Future route | Future | Depends on topology foundation. |

## 6. AI Copilot

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Assistant | `/ai-copilot` | Exists / v3.5 foundation | Privacy-first workspace with local context availability, provider disabled state, and rule-based summaries only. |
| Alert Explanation | `/ai-copilot` / future route | Partial foundation | Current page surfaces real alert context; future AI explanation must cite internal evidence. |
| Incident Summary | `/ai-copilot` / future route | Partial foundation | Current page surfaces incident counts/context; future summaries require human review. |
| Wireless Troubleshooting | `/ai-copilot` / future route | Partial foundation | Current page uses deterministic measurement diagnosis when present; no AI provider calls. |
| Cloud Troubleshooting | Future route | Do not implement yet | Requires cloud data model. |
| Privacy Settings | Future route | Future | Required before external AI providers; v3.5 documents privacy and provider architecture. |

## 7. Reports

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Reports & Export Center | `/reports` | Exists / v3.10 foundation | Report cards, export roadmap, backup status, safe sharing policy, and compliance/audit future. |
| Network Report | `/reports` / future detail route | Partial foundation | Uses dashboard summary readiness; needs renderer and topology/history data. |
| Wireless Report | `/reports` / future detail route | Partial foundation | Uses wireless health readiness; needs report export and evidence trail. |
| Security Report | `/reports` / future detail route | Partial foundation | Requires alert/log/incident evidence export and redaction. |
| Incident Report | `/reports` / future detail route | Partial foundation | Should export timeline, linked alerts, notes/tasks, and resolution later. |
| Backup Report | `/reports` / future detail route | Partial foundation | Uses `/system/health` backup metadata where available; no restore action exposed. |
| Export Center | `/reports` | Exists / v3.10 foundation | Centralized export format roadmap; no downloadable files generated yet. |

## 8. System / Appliance

| Page | Route | Current status | Notes |
| --- | --- | --- | --- |
| Appliance Status | `/admin/appliance` | Exists / Partial | Should show service health, version, storage, and checks. |
| Agents | `/agents` | Exists / Partial | Agent lifecycle exists; needs trust, rotation, and policy UX. |
| Credentials | Future route | Do not implement yet | Requires vault design. |
| Backup/Restore | Future route | Future | Needs encryption, validation, and restore tests. |
| Settings | Future route | Future | Should include organization, retention, and safe defaults. |
| Update Channel | Future route | Do not implement yet | Release/update pipeline not ready. |

## Pages That Should Not Be Implemented Yet

- Cloud accounts with real credentials.
- External AI provider configuration that can transmit data without explicit privacy controls.
- Forensics workspace with legal/evidence claims.
- Automated remediation that runs without human approval and audit logging.
- ISO release workflows inside the product UI before v4.0 packaging readiness.
