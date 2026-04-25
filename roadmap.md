# NetSentinel AI — Product Roadmap

## Phase 1: Foundation (MVP) ✅ Current

**Goal:** Establish a clean, runnable platform foundation.

- [x] Monorepo structure with frontend, backend, and Docker
- [x] PostgreSQL database with migration support
- [x] JWT authentication (register, login, token refresh)
- [x] Organization and site management
- [x] Asset inventory (manual)
- [x] Alert system with severity levels
- [x] Incident tracking with status workflow
- [x] Professional dashboard shell with dark theme
- [x] API documentation (Swagger/ReDoc)
- [x] Docker Compose for local development
- [x] Seed data for demo usage

---

## Phase 2: Network Discovery & Monitoring

**Goal:** Start seeing real network data.

- [ ] Network scanner agent (Python-based, runs on-prem)
- [ ] ICMP ping monitoring for asset uptime
- [ ] Port scanning and service detection
- [ ] Auto-discovery of devices on subnets
- [ ] Asset fingerprinting (OS, services, versions)
- [ ] Radio SNMP/API polling (Ubiquiti, Cambium, Mikrotik)
- [ ] Real-time dashboard updates via WebSocket
- [ ] Uptime history charts
- [ ] Network topology & Wireless Link visualization
- [ ] Agent ↔ backend communication protocol
- [ ] Agent deployment documentation

---

## Phase 3: Log Collection & Observability

**Goal:** Centralize logs and telemetry.

- [ ] Syslog collector (UDP/TCP)
- [ ] Log ingestion API
- [ ] Log storage (PostgreSQL + future TimescaleDB)
- [ ] Log search and filtering UI
- [ ] Dashboard widgets for log volume and trends
- [ ] Metric collection (CPU, memory, disk, bandwidth)
- [ ] Wireless RF metrics (RSSI, SNR, Noise Floor, TX/RX)
- [ ] Time-series storage for metrics
- [ ] Grafana-style metric charts & capacity tracking
- [ ] Alert rules engine (threshold-based)
- [ ] Email/Slack notification integration

---

## Phase 4: Security & Threat Detection

**Goal:** Detect and surface suspicious activity.

- [ ] Anomaly detection engine (statistical baselines)
- [ ] Failed login attempt monitoring
- [ ] Port scan detection
- [ ] Unusual traffic pattern alerts
- [ ] Vulnerability scanner integration (CVE database)
- [ ] Security event correlation
- [ ] Threat severity scoring
- [ ] MITRE ATT&CK mapping (informational)
- [ ] Security dashboard with risk score
- [ ] Compliance status overview

---

## Phase 5: AI-Powered Analysis

**Goal:** Make AI a core differentiator.

- [ ] LLM integration for incident explanation
- [ ] Natural language query over network data
- [ ] AI-generated remediation suggestions
- [ ] Automated incident summarization
- [ ] Pattern recognition across historical incidents
- [ ] Chat-based troubleshooting assistant
- [ ] Wireless Likely Cause Analysis (weather vs. alignment vs. interference)
- [ ] AI-powered alert triage (priority scoring)
- [ ] Anomaly explanation in plain English
- [ ] Integration with OpenAI / local LLM options
- [ ] AI confidence scoring and audit trail

---

## Phase 6: Automation & Response

**Goal:** Move from detection to action.

- [ ] Runbook library (predefined response actions)
- [ ] Safe remediation actions (block IP, restart service)
- [ ] Approval workflow for automated actions
- [ ] Scheduled scanning and health checks
- [ ] Auto-scaling alert rules
- [ ] Field visit logging and maintenance history (Wireless)
- [ ] Integration with ticketing systems (Jira, ServiceNow)
- [ ] Webhook actions for custom integrations
- [ ] Audit log for all automated actions
- [ ] Rollback capability for automated changes

---

## Phase 7: Enterprise & Scale

**Goal:** Production-grade for larger organizations.

- [ ] Role-based access control (RBAC)
- [ ] SSO / SAML / OIDC authentication
- [ ] Multi-tenant architecture hardening
- [ ] API rate limiting and quotas
- [ ] Kubernetes deployment (Helm charts)
- [ ] Horizontal scaling (multiple backend instances)
- [ ] Read replicas for database
- [ ] Data retention policies
- [ ] Export and reporting (PDF, CSV)
- [ ] SOC 2 / ISO 27001 compliance features
- [ ] White-label / custom branding
- [ ] SLA monitoring

---

## Phase 8: Ecosystem & Marketplace

**Goal:** Build an extensible platform.

- [ ] Plugin/extension system
- [ ] Third-party integrations marketplace
- [ ] Custom dashboard builder
- [ ] Public API with API keys
- [ ] Developer documentation portal
- [ ] Community edition vs. enterprise edition
- [ ] Mobile app (React Native)
- [ ] On-premise deployment guide
- [ ] Cloud-hosted SaaS option

---

## Version History

| Version | Phase | Target     | Status    |
|---------|-------|------------|-----------|
| 0.1.0   | 1     | MVP        | ✅ Done   |
| 0.2.0   | 2     | Discovery  | 📋 Next   |
| 0.3.0   | 3     | Observability | 📋 Planned |
| 0.4.0   | 4     | Security   | 📋 Planned |
| 0.5.0   | 5     | AI         | 📋 Planned |
| 0.6.0   | 6     | Automation | 📋 Planned |
| 1.0.0   | 7     | Enterprise | 📋 Planned |
| 2.0.0   | 8     | Ecosystem  | 📋 Planned |
