# NetSentinel AI Known Limitations

NetSentinel AI public alpha is not production-ready.

## Platform

- Public alpha is intended for local labs, demos, and appliance prototyping.
- Fine-grained RBAC is incomplete; organization isolation exists, but role-level
  policy depth is still MVP.
- Credential profile storage is MVP-grade and needs stronger secret management.
- SSE uses an MVP browser-compatible auth approach; short-lived stream tokens
  should replace it.
- No automatic rollback exists for failed updates.
- Backups need real restore drills before operational use.

## Appliance / Live Image

- Live ISO validation is pending for the current Desktop Appliance profile.
- Desktop ISO validation is pending; no production ISO is claimed.
- XFCE Desktop Appliance staging exists, but VMware/QEMU visual validation still
  must be completed for release artifacts.
- Live USB persistence partition support is not implemented.
- The installer is a prototype and should be tested in a VM before field use.
- Production hardening is documented but not fully automated.
- RC3 screenshots were captured from a real local app instance; future release
  screenshots must be refreshed from the running app, not generated or mocked.

## Device Integrations

- Real device captures are not committed yet.
- Generic SNMP supports standard system/interface data only.
- MikroTik RouterOS adapter has synthetic fixture coverage, but live transport
  needs field verification.
- TP-Link CPE and Ubiquiti airMAX RF metrics require real OIDs/API captures.
- Ubiquiti UniFi is not supported by the airMAX adapter.
- Fortinet support is syslog-only; there is no FortiGate/FortiManager API
  integration and no configuration changes.
- Cambium, Cisco, Aruba, Juniper, AWS, Azure, GCP, and Cloudflare connectors are
  planned/future only unless explicitly documented elsewhere.

## Operations

- Alert policies are intentionally conservative and need field tuning.
- Blocked traffic spike detection is not yet time-window aggregated.
- Service/CMDB mapping and SLA policy are placeholders.
- Agent scheduling/polling is foundation-level.
- Real-time UI update handling is MVP and should retain polling fallback.
- No formal project license has been selected yet; all rights are reserved until
  a license is added.
