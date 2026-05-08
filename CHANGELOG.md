# Changelog

## v2.0.0-alpha

Public Alpha preparation.

### Added

- Real JWT authentication, refresh flow, logout, and first-run setup.
- Organization isolation helpers and enforcement across scoped APIs.
- Dashboard APIs and polished NOC/SOC UI for operations overview.
- Asset monitoring, polling freshness, and deterministic status/risk helpers.
- Alert lifecycle: open, acknowledged, escalated, resolved.
- Incident workflow with owner assignment, notes, timeline, tasks, linked alerts,
  and resolution.
- Field measurements, wireless link relationships, diagnosis output, and alert
  deduplication for degraded wireless health.
- Edge Agent registration, heartbeat, token rotation, authenticated telemetry,
  and authenticated HTTP syslog ingestion.
- Normalized ActivityEvent feed and SSE live update foundation.
- Fortinet/FortiGate syslog profile with classification, normalized fields,
  activity events, and deduped high-value alert candidates.
- ICMP reachability, Generic SNMP polling, credential profiles, radio polling,
  and wireless/radio relationship foundations.
- Vendor adapter architecture with Generic SNMP, MikroTik RouterOS, TP-Link CPE,
  and Ubiquiti airMAX / UISP foundations.
- Fixture lab, support matrix, synthetic fixtures, and real device capture
  redaction/import workflow.
- Appliance installer/update/uninstall scripts, systemd examples,
  backup/restore scripts, production Docker Compose, reverse proxy examples, and
  hardening docs.
- Debian live appliance scaffold, first-boot/status scripts, live-build wrapper,
  and VM test plan.
- Public alpha documentation, release checklist, known limitations, demo
  workflow, and real RC3 screenshots captured from the running app.
- Clean Alembic public-alpha baseline so `alembic upgrade head` creates the
  current schema on a fresh database.
- Polished UI for Dashboard, Assets, Alerts, Incidents, Logs, Agents, Radio
  Devices, Field Measurements, Wireless Link detail, Login, Setup, and
  Appliance Status.

### Known Limitations

- Not production-ready.
- No reviewed real device captures committed yet.
- Live ISO scaffold exists, but no production ISO has been built/tested.
- Vendor adapters remain partial/foundation work.
- TP-Link/Ubiquiti RF metrics need real OID/API captures.
- MikroTik live transport needs field verification.
- Fortinet support is syslog-only.
- Credential storage and SSE auth are MVP-grade.
- No automatic rollback or persistent Live USB partition workflow yet.
- No formal project license has been selected yet.
