# Contributing To NetSentinel AI

NetSentinel AI is in public alpha. Contributions should keep the project
accurate, safe, local-first, and useful for network/security operators.

## Ground Rules

- Do not commit secrets, `.env` files, database dumps, backups, tokens, private
  keys, raw captures, cloud credentials, or customer data.
- Do not claim production readiness unless the repository proves it.
- Do not add destructive response actions, auto-blocking, or device
  configuration changes without an approved design.
- Keep vendor/cloud/AI support claims matched to implemented code and reviewed
  documentation.
- Prefer incremental changes over rewrites.

## Development Checks

Run the checks relevant to your change:

```bash
bash scripts/validate_backend.sh
cd frontend && npx tsc --noEmit --pretty false
npm --prefix frontend run build
deploy/live-image/build-live-prototype.sh --check-only
```

For script changes:

```bash
bash -n scripts/backup.sh
bash -n scripts/restore.sh
bash -n deploy/live-image/scripts/open-netsentinel-console.sh
bash -n deploy/live-image/scripts/netsentinel-menu.sh
bash -n deploy/live-image/scripts/appliance-status.sh
```

Do not build an ISO, tag, or publish artifacts unless maintainers explicitly
approve that task.

## Documentation Style

- Use `NetSentinel AI`, `NetSentinel AI OS`, and `NetSentinel AI Console`
  consistently.
- Mark features as implemented, partial, planned, or recommended.
- Keep limitations visible.
- Do not use Debian/Kali/Ubuntu/vendor branding as product identity.
- Link only to screenshots that exist and were captured from the real app/OS.

## Real Device Captures

Follow [Real Device Capture Guide](docs/REAL_DEVICE_CAPTURE_GUIDE.md).

Raw captures must never be committed. Commit only reviewed, redacted fixtures
that cannot expose customer data, credentials, private IP context, serial
numbers, or secrets.

## Pull Requests

Pull requests should include:

- summary of the change,
- validation commands run,
- security/data-safety notes,
- screenshots for UI changes when available,
- updated docs/tests for behavior changes.
