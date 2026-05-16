# Changelog

## Unreleased

### Added

- v3.1 Control Center Dashboard.
- v3.2 Network Operations workspace.
- v3.3 Wireless Diagnostics Pro workspace.
- v3.4 Security Operations Center workspace.
- v3.5 AI Copilot foundation with privacy-first documentation.
- v3.6 Cloud & Hybrid foundation workspace.
- v3.8/v3.9 XFCE Desktop Appliance Experience and cleanup.
- v3.10 Reports, Backup & Export Center workspace.
- v3.11 Desktop ISO preflight docs and VM test plan.
- v3.12 backend validation helper and desktop wallpaper binding verification.
- GitHub presentation docs, screenshot rules, diagram guide, docs portal, and
  release prep checklist.

### Changed

- README now presents NetSentinel AI as a public-alpha platform and OS vision
  with explicit limitations.
- Live-image package profile includes Desktop Appliance packages and both modern
  Compose plugin and legacy compose compatibility package.
- Documentation now emphasizes no kiosk default and no automatic browser launch.

### Known Limitations

- Not production-ready.
- No production ISO is claimed.
- Cloud connectors are roadmap/foundation.
- AI provider calls are not active by default.
- Vendor adapters remain partial/foundation pending reviewed real captures.
- Report export generation is foundation work.
- License has not been selected.

## v2.0.0-alpha

Public Alpha preparation.

### Added

- Real JWT authentication, refresh flow, logout, and first-run setup.
- Organization isolation helpers and enforcement across scoped APIs.
- Dashboard APIs and polished NOC/SOC UI for operations overview.
- Asset monitoring, polling freshness, and deterministic status/risk helpers.
- Alert lifecycle: open, acknowledged, escalated, resolved.
- Incident workflow with owner assignment, notes, timeline events, tasks, linked
  alerts, and resolution.
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
- Live appliance scaffold, first-boot/status scripts, live-build wrapper, and VM
  test plan.
- Public alpha documentation, release checklist, known limitations, demo
  workflow, and real screenshots captured from the running app.
- Clean Alembic public-alpha baseline so `alembic upgrade head` creates the
  current schema on a fresh database.

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
