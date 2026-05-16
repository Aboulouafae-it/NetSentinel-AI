---
name: Bug report
about: Report a reproducible NetSentinel AI bug
title: "[Bug] "
labels: bug
---

## Summary

Describe the issue clearly.

## Affected Area

- [ ] Control Center / Dashboard
- [ ] Network Operations
- [ ] Wireless Diagnostics
- [ ] Security Operations
- [ ] AI Copilot
- [ ] Cloud & Hybrid
- [ ] Reports & Export Center
- [ ] Desktop Appliance / live-image
- [ ] Backend API
- [ ] Edge Agent
- [ ] Documentation

## Steps To Reproduce

1.
2.
3.

## Expected Behavior

## Actual Behavior

## Environment

- Install mode: Docker Compose / desktop appliance / live-image scaffold / other
- OS:
- Browser:
- Commit or branch:
- Backend/frontend versions if known:

## Logs / Screenshots

Attach screenshots or concise logs when helpful.

Do not paste secrets, tokens, public customer IPs, private keys, `.env` content,
raw captures, database dumps, or customer data.

## Validation Already Tried

- [ ] `bash scripts/validate_backend.sh`
- [ ] `cd frontend && npx tsc --noEmit --pretty false`
- [ ] `npm --prefix frontend run build`
- [ ] `deploy/live-image/build-live-prototype.sh --check-only`
