# NetSentinel AI Diagram Guide

This directory stores reviewed architecture and flow diagrams. Diagrams should
describe the real project structure or clearly marked roadmap architecture.

Do not include proprietary diagram assets. Do not include customer network diagrams,
customer topology diagrams, private addressing plans, or unreviewed vendor/cloud
claims.

## Platform Architecture

```mermaid
flowchart LR
  Operator[Operator / Technician] --> Console[Next.js Console]
  Desktop[XFCE Desktop Appliance] --> Console
  Console --> API[FastAPI Backend]
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis / ARQ Foundation)]
  Agent[Python Edge Agent] --> API
  Syslog[Syslog / Firewall Events] --> API
  Wireless[Wireless Links / Field Measurements] --> API
  API --> Alerts[Alerts]
  Alerts --> Incidents[Incidents]
  API --> Reports[Reports Foundation]
```

## Data Flow

```mermaid
flowchart LR
  Agent[Edge Agent Telemetry] --> Ingest[Backend Ingestion APIs]
  Syslog[Syslog / Fortinet Events] --> Ingest
  SNMP[SNMP / Polling Foundation] --> Ingest
  Ingest --> Normalize[Validation and Normalization]
  Normalize --> DB[(PostgreSQL)]
  Normalize --> AlertEngine[Alert / Policy Logic]
  AlertEngine --> Alerts[Alerts]
  Alerts --> Incidents[Incidents]
  DB --> Dashboard[Control Center / Workspaces]
```

## Wireless Diagnostics Flow

```mermaid
flowchart LR
  Radio[Radio Device] --> Metrics[Adapter / Manual Metrics]
  Field[Field Measurement Form] --> Metrics
  Metrics --> Engine[Rule-Based Wireless Health Engine]
  Engine --> Score[Health Score and Status]
  Engine --> Cause[Likely Root Cause]
  Engine --> Actions[Recommended Technician Actions]
  Score --> Alert{Poor or Critical?}
  Alert -->|Yes| WirelessAlert[Wireless Alert Candidate]
  Alert -->|No| History[Measurement History]
  WirelessAlert --> Incident[Incident Workflow]
```

## Desktop Appliance Flow

```mermaid
flowchart LR
  Boot[Boot NetSentinel AI OS] --> LightDM[LightDM Autologin]
  LightDM --> XFCE[XFCE Desktop Appliance]
  XFCE --> Shortcuts[NetSentinel Desktop Shortcuts]
  Shortcuts --> Console[Open NetSentinel AI Console]
  Shortcuts --> Menu[Control Center Terminal Menu]
  Shortcuts --> Status[Appliance Status]
  Console --> LocalApp[Local Dashboard / Setup]
```

## Future Cloud and AI Architecture

```mermaid
flowchart LR
  Cloud[Cloud Connector Future] --> Redaction[Credential Scope and Redaction Layer]
  Logs[Internal Alerts / Incidents / Wireless Context] --> Redaction
  Redaction --> Approval[Operator Approval]
  Approval --> Provider{Provider Configured?}
  Provider -->|No| Local[Local Deterministic Summary]
  Provider -->|Yes| AI[Optional AI Provider]
  AI --> Response[Evidence-Based Assistant Response]
  Local --> Response
```

## Export Guidance

GitHub renders Mermaid diagrams in Markdown. For PDFs or presentation decks,
export reviewed Mermaid diagrams to SVG/PNG and store them here with matching
source Markdown.
