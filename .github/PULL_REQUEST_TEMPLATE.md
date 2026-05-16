## Summary

Describe the change and why it is needed.

## Scope

- [ ] Frontend
- [ ] Backend
- [ ] Edge Agent
- [ ] Desktop Appliance / live-image
- [ ] Documentation
- [ ] Tests
- [ ] Security/hardening

## Verification

- [ ] `bash scripts/validate_backend.sh`
- [ ] `cd frontend && npx tsc --noEmit --pretty false`
- [ ] `npm --prefix frontend run build`
- [ ] `deploy/live-image/build-live-prototype.sh --check-only`
- [ ] Relevant `bash -n` script checks
- [ ] Not applicable, docs-only change

## Security / Data Safety

- [ ] No `.env`, secrets, tokens, private keys, dumps, backups, raw captures, or customer data
- [ ] Screenshots are real, reviewed, and redacted
- [ ] Real device captures, if any, are redacted and reviewed
- [ ] No unsupported production/vendor/cloud/AI claims were added
- [ ] No destructive automation was added

## Screenshots

Attach real screenshots for UI changes. Do not attach generated mockups as proof
of product state.

## Documentation

- [ ] README/docs updated
- [ ] Known limitations updated where relevant
- [ ] Roadmap/foundation status remains honest
