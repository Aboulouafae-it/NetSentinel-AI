# GitHub Release Prep Checklist

Use this checklist before publishing a GitHub release, creating a tag, or
sharing release artifacts.

## Repository Presentation

| Item | Status | Notes |
| --- | --- | --- |
| README current | PASS | README reflects v3/v4 product and OS direction. |
| Screenshot links reviewed | PASS | README links only to existing screenshot files. |
| Missing screenshots listed | PASS | Pending screenshots are listed as text, not broken image links. |
| Docs index present | PASS | `docs/README.md` is the documentation portal. |
| Diagram guide present | PASS | Mermaid diagrams are documented under `docs/assets/diagrams/`. |
| GitHub templates present | PASS | Bug, feature, and PR templates exist. |
| License status clear | PASS | License not selected; all rights reserved until license is added. |

## Validation

| Item | Status | Command |
| --- | --- | --- |
| Frontend TypeScript | PASS | `cd frontend && npx tsc --noEmit --pretty false` |
| Frontend build | PASS | `npm --prefix frontend run build` |
| Backend validation | PASS | `bash scripts/validate_backend.sh` |
| Live-image check-only | PASS | `deploy/live-image/build-live-prototype.sh --check-only` |
| Secret scan | PASS | Targeted docs/repo scan before release. |
| Forbidden payload scan | PASS | No `.env`, dumps, raw captures, keys, or customer data. |
| ISO build status | NOT RUN | Tag approval and explicit ISO build task required. |

## Safety Checks

- [ ] No `.env` files except documented examples.
- [ ] No private keys, tokens, API keys, cloud credentials, or SSH keys.
- [ ] No database dumps, backups, raw captures, or customer data.
- [ ] Screenshots are reviewed and redacted.
- [ ] Cloud and AI claims are marked foundation/roadmap unless implemented.
- [ ] Vendor support claims match the support matrix.
- [ ] Known limitations are current.
- [ ] SECURITY.md is current.
- [ ] Tag/release approval has been explicitly given by the owner.

## Release Notes Must Include

- Current project status: Public Alpha / Active Development.
- Production readiness warning.
- Validation commands and results.
- ISO build status and checksum if an ISO is produced.
- Known limitations and unsupported features.
- Security notes for secrets, credentials, and captures.

Do not tag or publish automatically from automation or assistant workflows unless
the owner explicitly approves that specific action.
