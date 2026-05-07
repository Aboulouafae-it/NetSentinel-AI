# NetSentinel AI Database Migrations

Run migrations from the `backend` directory:

```bash
alembic upgrade head
```

Create future revisions with:

```bash
alembic revision --autogenerate -m "describe change"
```

For v0.2, schema changes for field measurement link ownership, alert metadata and deduplication, radio device organization ownership, and discovery organization ownership are managed in Alembic instead of startup-time table alteration.

For v0.3, alert lifecycle status and incident workflow fields (`notes`, `timeline_events`, `tasks`, and `impacted_services`) are managed by the next Alembic revision.

For v0.4, asset monitoring adds `assets.last_seen`; dashboard endpoints are query-only and do not require extra tables.

For v0.5, wireless/radio integration adds credential profiles, asset polling state, radio polling state, and near/far radio relationships on wireless links. Credential secrets are stored as MVP secret material and are never returned by API responses; production encryption/KMS is still required before real deployment.

For v0.6, edge agents and normalized activity events are stored in `edge_agents` and `activity_events`. HTTP syslog ingestion reuses `logs` with syslog metadata in `metadata_json`.

For v0.9, vendor adapter polling stores normalized radio snapshots on `radio_devices`: latest device info, interface status, wireless metrics, and adapter capabilities.
