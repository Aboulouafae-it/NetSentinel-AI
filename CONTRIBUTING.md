# Contributing To NetSentinel AI

NetSentinel AI is in public alpha. Contributions should keep the project honest,
safe, and local-first.

## Guidelines

- Do not commit secrets, `.env` files, database dumps, backups, tokens, private
  keys, raw captures, or customer data.
- Keep vendor integrations read-only unless maintainers explicitly approve a
  safe design.
- Add or update tests for backend behavior.
- Run frontend TypeScript/build checks when touching UI.
- Mark MVP limitations clearly in docs and UI.

## Useful Checks

```bash
python -m pytest backend/tests
cd backend && python -c "import app.main"
cd frontend && npx tsc --noEmit
cd frontend && npm run build
deploy/live-image/build-live-prototype.sh --check-only
```

## Real Device Captures

Follow `docs/REAL_DEVICE_CAPTURE_GUIDE.md`. Raw captures must never be committed.
