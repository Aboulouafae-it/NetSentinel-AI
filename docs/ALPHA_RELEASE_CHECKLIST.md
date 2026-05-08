# NetSentinel AI Alpha Release Checklist

Run this checklist before tagging or publishing a public alpha.

Status values:

- **Passed**: verified in RC2/RC3.
- **Pending**: known work remains before a stronger public/field release.
- **Not tested**: not exercised in the current environment.
- **Not applicable**: intentionally outside this alpha.

## Verification Gates

| Gate | Status | Notes |
| --- | --- | --- |
| Backend tests | Passed | `133 passed, 1 skipped` in RC3. |
| Backend import check | Passed | `cd backend && python -c "import app.main"`. |
| Frontend TypeScript | Passed | `cd frontend && npx tsc --noEmit`. |
| Frontend production build | Passed | `cd frontend && npm run build`. |
| Clean Alembic migration validation | Passed | `scripts/validate_clean_migrations.sh`; creates `field_measurements` and `assets.last_seen`. |
| RC2 clean demo workflow | Passed | Verified on an isolated migrated database. |
| Docker Compose startup | Passed | Stack rebuild/start and backend/frontend probes passed. |
| Backup dry run | Passed | `scripts/backup.sh --dry-run`. |
| Live image check-only | Passed | `deploy/live-image/build-live-prototype.sh --check-only`; ISO build skipped without `live-build`. |
| Bash syntax checks | Passed | Deployment, live image, backup, restore, and migration scripts. |
| Secret scan | Passed | No real secrets found; placeholders/test strings only. |
| Real screenshots | Passed | RC3 screenshots captured from the running app and linked from README. |
| License decision | Pending | No `LICENSE` file exists; README states all rights reserved until a license is added. |
| Clean VM installer test | Not tested | Installer docs exist; full VM install remains pending. |
| Real ISO build/boot test | Not tested | Live image scaffold exists; production ISO not built or boot-tested. |
| v2.1 clean VM install validation | Pending | See `docs/CLEAN_VM_INSTALL_TEST.md`; no clean nested VM is available in the current environment. |
| v2.1 real ISO build validation | Pending | See `docs/REAL_ISO_BUILD_TEST.md`; `live-build` is not installed in the current environment. |
| v2.1 ISO VM boot validation | Pending | See `docs/ISO_VM_BOOT_TEST.md`; no ISO artifact or QEMU runtime is available locally. |

## Safety Checks

| Check | Status | Notes |
| --- | --- | --- |
| `.gitignore` excludes generated files and secrets | Passed | Includes env files, dumps, DB files, keys, tokens, backups, raw captures, live build artifacts. |
| `.env.example` and `.env.production.example` are placeholders | Passed | Safe to commit. |
| Raw/unredacted captures excluded | Passed | Raw capture paths ignored. |
| Stale DB recovery documented | Passed | See `docs/DB_MIGRATION_RECOVERY.md`. |

## Product Flow Checks

| Flow | Status | Notes |
| --- | --- | --- |
| First-run setup | Passed | Verified and screenshot-captured. |
| Login/logout | Passed | Verified and login screenshot captured. |
| Dashboard | Passed | Populated RC3 screenshot captured. |
| Asset creation/polling | Passed | RC2 demo workflow. |
| Field measurement diagnosis | Passed | RC2 demo workflow. |
| Poor/Critical alert path | Passed | RC2 demo workflow. |
| Alert lifecycle | Passed | Tests and RC workflow coverage. |
| Incident creation from alert | Passed | RC2 demo workflow. |
| Edge Agent heartbeat | Passed | RC2 demo workflow. |
| Syslog/Fortinet ingest | Passed | RC2 demo workflow; logs screenshot captured. |
| Appliance health page | Passed | RC3 screenshot captured. |

## Release Documents

| Document | Status |
| --- | --- |
| README | Passed |
| CHANGELOG | Passed |
| SECURITY | Passed |
| CONTRIBUTING | Passed |
| CODE_OF_CONDUCT | Passed |
| Known limitations | Passed |
| Demo workflow | Passed |
| Vendor adapter support matrix | Passed |
| Deployment hardening | Passed |
| Real device capture guide | Passed |
