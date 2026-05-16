# NetSentinel AI OS v2.3-pre Security Audit & Hardening Gate

Status: **COMPLETE** — security gate approved for v2.3 Real ISO Build.

Date: 2026-05-08

This review is scoped to the public-alpha appliance prototype. It is not a
formal penetration test, compliance audit, or production readiness approval.

## Summary

NetSentinel AI OS remains a public alpha / MVP. The platform has meaningful
baseline protections: first-run setup, JWT authentication, organization-scoped
queries across all major resources, authenticated Edge Agent heartbeat/telemetry,
authenticated syslog ingestion, production config validation, Docker Compose
production isolation, ignored secret paths, and live-image forbidden-file
checks.

### Fixes applied during this gate

- Public `/auth/register` is disabled; first-run setup is the only account
  creation path for appliance deployments.
- Syslog ingestion applies bounded string lengths and returns a controlled
  error for invalid timestamps.
- Telemetry payloads apply bounded identifier/string fields and bounded
  bulk request size (250 items max).
- Activity event metadata scrubs token/password/secret-like keys and
  values before persistence.
- Restore archives are validated before extraction to reject absolute paths and
  parent-directory traversal.
- The frontend Next.js stack was patched from `14.2.3` to `14.2.35`.
- `python-jose` upgraded from `3.3.0` to `3.4.0` (fixes PYSEC-2024-232,
  PYSEC-2024-233 JWT DoS CVEs).
- `python-multipart` upgraded from `0.0.20` to `0.0.27` (fixes CVE-2026-24486,
  CVE-2026-40347, CVE-2026-42561 request parsing CVEs).
- Local `.env` moved out of the repository root to
  `~/netsentinel-private-config/.env.backup`.

## Threat Model

### Local appliance deployment

Primary threats:

- Exposed management UI/API on untrusted networks.
- Default or weak secrets in production-style mode.
- Public PostgreSQL/Redis exposure.
- Operator workstation compromise leading to browser token theft.
- Backup archive exposure.

Controls:

- Production config rejects default `SECRET_KEY`, development edge token, debug
  mode, and broad CORS.
- Production Compose binds frontend/backend to loopback by default and does not
  publish PostgreSQL/Redis.
- First-run setup requires a strong initial password (≥12 chars) and is disabled
  after initialization.
- Deployment hardening docs require HTTPS reverse proxy and firewalling.

### First-run setup

Controls:

- Setup checks both organization and user counts and returns `409` once
  initialized.
- Password length validation enforces minimum 12 characters.
- Public self-registration is disabled; returns `403`.

### JWT authentication and sessions

Controls:

- JWTs include token type (`access`/`refresh`) and expiry.
- Invalid/expired tokens are rejected at decode.
- Production config rejects the default secret at startup.
- Auth errors return generic messages without leaking secrets.

### Organization isolation

Controls:

- All protected routes scope queries with `current_user.organization_id`.
- Credential profile responses omit secret material (`has_secret` boolean only).
- Dashboard aggregates query by organization.
- Agent management, syslog, telemetry, events, logs, discovery, alerts,
  incidents, sites, assets, wireless links, radio devices, field measurements,
  credentials, and system health are all org-scoped.
- Cross-org reads and writes are structurally blocked.

### Edge Agents, heartbeat, and telemetry

Controls:

- Agent tokens generated with `secrets.token_urlsafe(32)`.
- Tokens are SHA-256 hashed; plaintext shown only once at registration/rotation.
- Token verification uses `hmac.compare_digest` (timing-safe).
- Heartbeat and telemetry reject revoked agents (`403`).
- Rotated old tokens are rejected immediately.
- Telemetry timestamps are checked against a configurable replay window.
- Activity metadata scrubs token-like values before persistence.

### Syslog ingestion and Fortinet parsing

Controls:

- Syslog endpoint requires agent authentication.
- All request fields are bounded (message: 8192, raw: 16384).
- Invalid timestamps return `422`.
- Alert deduplication prevents alert storms.
- React escapes rendered strings by default; no `dangerouslySetInnerHTML` usage.

### Input validation and injection

Controls:

- SQLAlchemy ORM parameterized queries prevent SQL injection.
- Subprocess calls use `create_subprocess_exec` (not `shell=True`).
- Subnet input validated through `ipaddress.IPv4Network` with max `/20` limit.
- No `eval()`, `exec()`, `os.system()`, or `subprocess.run(shell=True)` usage.
- No `dangerouslySetInnerHTML` in frontend.
- Restore script validates tar paths against absolute-path and `..` traversal.
- Pydantic models enforce field length limits on user inputs.

### SNMP credentials and vendor adapters

Controls:

- Credential profiles are organization-scoped.
- Response helpers return `has_secret` boolean, never the secret material.
- Adapters are read-only.
- Activity metadata scrubbing redacts credential/token-like keys.

Accepted MVP risk:

- Secret material is stored by the application without production KMS/HSM
  integration. Future encryption-at-rest or KMS integration is planned.

### Docker Compose and production deployment

Controls:

- Production Compose does not publish PostgreSQL/Redis ports (internal network
  only).
- Docker socket is not mounted into application containers.
- Production Compose uses restart policies and health checks.
- Backend production config rejects unsafe settings and blocks startup.
- `BACKEND_BIND` and `FRONTEND_BIND` default to `127.0.0.1`.
- `POSTGRES_PASSWORD` uses `${...:?}` syntax requiring explicit setting.

### Live ISO / appliance image

Controls:

- `.gitignore` excludes env files, dumps, DB files, keys, tokens, backups,
  raw captures, and live-build artifacts.
- `build-live-prototype.sh --check-only` scans live includes for forbidden
  secret patterns and secret-like content.
- First boot/install scripts generate secrets instead of baking them in.
- No `.env`, tokens, keys, database dumps, or real captures found in
  `includes.chroot`.
- Live includes contain only branding files, status scripts, and documentation.

### Backup and restore

Controls:

- Backup dry-run exists.
- Uninstall preserves data unless explicit `--purge` is requested (with 10s
  abort window).
- Restore requires `--yes` before replacing the database.
- Restore validates tar paths before extraction.
- Update script creates backup before applying changes.

## Tools Run

| Tool | Command | Result |
| --- | --- | --- |
| Git status | `git status --short` | 27 modified, 4 untracked |
| Secret scan | `grep -rnI ... SECRET_KEY\|JWT_SECRET\|...` | No real secrets found; safe references only |
| npm audit | `cd frontend && npm audit` | 5 advisories (1 moderate, 4 high) — all require Next.js 14→16 major upgrade |
| pip-audit | `pip-audit` | 8 remaining findings (see below) |
| bandit | `bandit -r backend/app -ll` | 0 medium/high issues; 6 low-severity false positives |
| bandit (low) | `bandit -r backend/app -l` | 6 findings: 2× B105 (false positive), 2× B110 (intentional), 2× B311 (seed data) |
| Shell syntax | `bash -n` on all scripts | 10/10 passed |
| Live image check | `build-live-prototype.sh --check-only` | Passed |
| Backend tests | `pytest tests/` | 137 passed, 1 skipped |
| Frontend TypeScript | `npx tsc --noEmit` | Clean |
| Frontend build | `npm run build` | Clean |
| Backup dry-run | `scripts/backup.sh --dry-run` | Passed |

## Vulnerability Findings

### npm audit (5 advisories)

| Package | Severity | CVE/Advisory | Fix | Decision |
| --- | --- | --- | --- | --- |
| next 14.2.35 | High | GHSA-9g9p, GHSA-h25m, GHSA-ggv3, GHSA-3x4c, GHSA-q4gf | next@16.2.6 (breaking) | Accepted Public Alpha risk |
| postcss <8.5.10 | Moderate | GHSA-qx2v | next@16.2.6 (breaking) | Accepted Public Alpha risk |
| glob 10.x | High | GHSA-5j98 | eslint-config-next@16.x (breaking) | Accepted Public Alpha risk (dev-time only) |

**Rationale**: All 5 advisories require upgrading to Next.js 16.x, which is a
major breaking framework migration. Next.js 14.2.35 is the latest 14.x patch.
The high-severity Next.js advisories relate to:
- Image Optimizer DoS (not used in current deployment)
- HTTP request deserialization DoS (RSC-specific edge case)
- HTTP request smuggling in rewrites (no external rewrites configured)
- Unbounded image cache growth (no remote image optimization configured)
- Server Components DoS (edge case)

These are **accepted as Public Alpha lab-only risks**. The Next.js 16 migration
is planned for a future release cycle with dedicated testing.

### pip-audit (8 remaining findings)

| Package | Version | CVE | Fix | Decision |
| --- | --- | --- | --- | --- |
| pip | 25.1.1 | CVE-2025-8869, CVE-2026-1703, CVE-2026-3219, CVE-2026-6357 | 25.3–26.1 | Build tool only; not a runtime risk |
| pyasn1 | 0.4.8 | CVE-2026-30922 | 0.6.3 | Blocked by python-jose <0.5.0 constraint; accepted |
| pytest | 8.3.4 | CVE-2025-71176 | 9.0.3 | Test dependency only; not in production image |
| starlette | 0.41.3 | CVE-2025-54121, CVE-2025-62727 | 0.47.2+ | Requires FastAPI upgrade; accepted lab-only risk |

**Fixed in this gate**:
- `python-jose` 3.3.0 → 3.4.0 (PYSEC-2024-232, PYSEC-2024-233)
- `python-multipart` 0.0.20 → 0.0.27 (CVE-2026-24486, CVE-2026-40347,
  CVE-2026-42561)

### bandit (0 medium/high)

All 6 low-severity findings are false positives or accepted patterns:

| Finding | File | Explanation |
| --- | --- | --- |
| B105 hardcoded password | config.py:71 | Comparison check for unsafe dev secret, not a hardcoded password |
| B105 hardcoded password | credential.py:15 | Enum value `api_token`, not a password |
| B110 try/except/pass | field_measurements.py:267 | Intentional; alert failure must not block measurement save |
| B110 try/except/pass | threat_engine.py:82 | Intentional; bad regex must not crash threat engine |
| B311 pseudo-random | seed.py | Seed data generation; not security-critical |
| B311 pseudo-random | seed.py | Same as above |

## Risk Register

| Risk | Severity | Status |
| --- | --- | --- |
| Local `.env` in workspace | High | **Fixed**: moved to `~/netsentinel-private-config/.env.backup` |
| Public self-registration | High | **Fixed**: returns 403 |
| Restore archive traversal | High | **Fixed**: validates tar paths |
| Syslog oversized payloads | Medium | **Fixed**: bounded fields |
| Telemetry unbounded bulk | Medium | **Fixed**: 250-item max |
| Activity metadata leakage | Medium | **Fixed**: metadata scrubber |
| python-jose JWT DoS | Medium | **Fixed**: upgraded to 3.4.0 |
| python-multipart parsing CVEs | Medium | **Fixed**: upgraded to 0.0.27 |
| npm audit high advisories | High | Accepted: requires Next 16 major migration |
| starlette CVEs | Medium | Accepted: requires FastAPI major upgrade |
| JWT localStorage storage | Medium | Accepted MVP risk |
| SSE token query parameter | Medium | Accepted MVP risk |
| MVP credential storage | Medium | Accepted MVP risk; KMS planned |
| Dev Compose exposes DB/Redis | Medium | Accepted dev-only risk |
| Fine-grained RBAC incomplete | Medium | Accepted MVP risk |
| In-memory rate limiting | Low | Accepted MVP risk |

## Accepted Public Alpha Risks

- JWTs are stored in browser localStorage.
- SSE uses a query token until short-lived stream tokens are implemented.
- Credential storage is MVP-grade (no KMS/HSM).
- Rate limiting is in-memory and per-process.
- Fine-grained RBAC is incomplete.
- Development Compose exposes PostgreSQL/Redis (production Compose does not).
- Blocked traffic spike detection is not yet window-aggregated.
- npm audit advisories require Next.js 16 migration (planned separately).
- starlette CVEs require FastAPI upgrade (planned separately).
- pyasn1 CVE blocked by python-jose version constraint.
- pip/pytest CVEs are build/test-only, not runtime.
- Live ISO persistence not implemented (documented).

## Checks Performed

### Authentication and Setup
- [x] `/api/v1/auth/register` returns 403 (disabled)
- [x] `/api/v1/setup/first-run` blocked after initialization (409)
- [x] Production rejects default/unsafe SECRET_KEY
- [x] Weak demo credentials are development-only
- [x] Auth errors do not leak secrets
- [x] Expired/invalid tokens rejected

### Organization Isolation
- [x] All CRUD routes scope by `current_user.organization_id`
- [x] Credentials are org-scoped
- [x] Agents are org-scoped
- [x] Syslog/telemetry are org-scoped
- [x] Dashboard aggregates current org only
- [x] Events stream is org-scoped

### Input Validation
- [x] SQLAlchemy ORM prevents SQL injection
- [x] `create_subprocess_exec` prevents shell injection
- [x] `ipaddress.IPv4Network` validates subnet inputs
- [x] No `eval`/`exec`/`os.system`/`shell=True`
- [x] No `dangerouslySetInnerHTML`
- [x] Pydantic enforces field length limits
- [x] Restore script blocks path traversal

### Edge Agent Security
- [x] Tokens generated with `secrets.token_urlsafe(32)`
- [x] Tokens hashed with SHA-256
- [x] Timing-safe comparison with `hmac.compare_digest`
- [x] Tokens shown only once (registration/rotation)
- [x] Revoked agents rejected (403)
- [x] Telemetry replay window enforced
- [x] Activity metadata scrubbed

### Credential Hardening
- [x] SNMP communities never returned in responses
- [x] RouterOS passwords never returned
- [x] API tokens never returned
- [x] Credential secrets not logged
- [x] MVP storage risk documented
- [x] Future KMS plan documented

### Docker/Compose/Appliance
- [x] PostgreSQL not publicly exposed in production
- [x] Redis not publicly exposed in production
- [x] Docker socket not mounted
- [x] Default secrets rejected in production
- [x] Debug mode disabled in production
- [x] CORS restricted in production
- [x] Health endpoint does not leak secrets
- [x] Uninstall requires `--purge` for data deletion
- [x] Update creates backup before changes

### Live Image
- [x] No secrets in includes.chroot
- [x] No `.env` in includes.chroot
- [x] No database dumps
- [x] No raw captures
- [x] First-run setup required
- [x] SECRET_KEY generated at install/first boot
- [x] PostgreSQL/Redis not publicly exposed by default

### Scripts
- [x] `bash -n` passes on all 10 scripts
- [x] Restore validates archive paths
- [x] Backup dry-run works

## Final Gate Decision

**Approved to proceed to v2.3 Real ISO Build: YES**

All critical and high-severity code-level security issues have been resolved.
The remaining findings are:
- npm audit advisories requiring a major Next.js 16 migration (explicitly
  accepted as Public Alpha lab-only risk)
- starlette/pip/pytest/pyasn1 CVEs in the Python stack that require major
  dependency upgrades (accepted as Public Alpha risk with fixes planned)
- 6 bandit low-severity findings that are all false positives or intentional

The local `.env` has been removed from the repository root. No secrets are
committed or staged. The live image contains no forbidden payloads.

### Next steps for v2.3 Real ISO Build

```bash
# 1. Commit security gate changes
git add -A
git commit -m "v2.3-pre: security gate cleanup — dependency patches, .env removal, audit doc"

# 2. Tag v2.3-pre
git tag -a v2.3-pre -m "Security gate approved for ISO build"

# 3. Build the ISO (requires live-build on Debian)
cd deploy/live-image
sudo ./build-live-prototype.sh --build

# 4. Smoke-test the ISO
./scripts/qemu-smoke-test.sh live-image-amd64.hybrid.iso
```

Do not execute these steps until the gate decision is reviewed and approved
by the project maintainer.
