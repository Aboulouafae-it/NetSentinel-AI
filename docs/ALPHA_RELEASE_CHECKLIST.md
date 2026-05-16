# NetSentinel AI Alpha Release Checklist

Run this checklist before tagging or publishing a public alpha.

Status values:

- **Passed**: verified in RC2/RC3 or v2.3-pre gate.
- **Pending**: known work remains before a stronger public/field release.
- **Not tested**: not exercised in the current environment.
- **Not applicable**: intentionally outside this alpha.

## Verification Gates

| Gate | Status | Notes |
| --- | --- | --- |
| Backend tests | Passed | `137 passed, 1 skipped` in v2.3-pre gate. |
| Backend import check | Passed | `cd backend && python -c "import app.main"`. |
| Frontend TypeScript | Passed | `cd frontend && npx tsc --noEmit`. |
| Frontend production build | Passed | `cd frontend && npm run build`. |
| Clean Alembic migration validation | Passed | `scripts/validate_clean_migrations.sh`; requires Docker. |
| RC2 clean demo workflow | Passed | Verified on an isolated migrated database. |
| Docker Compose startup | Passed | Stack rebuild/start and backend/frontend probes passed. |
| Backup dry run | Passed | `scripts/backup.sh --dry-run`. |
| Live image check-only | Passed | `deploy/live-image/build-live-prototype.sh --check-only`; live-build detected. |
| Bash syntax checks | Passed | All 10 deployment/live-image/backup/restore/migration scripts. |
| Secret scan | Passed | No real secrets found; placeholders/test strings only. |
| Real screenshots | Passed | RC3 screenshots captured from the running app and linked from README. |
| License decision | Pending | No `LICENSE` file exists; README states all rights reserved until a license is added. |
| Clean VM installer test | Not tested | Installer docs exist; full VM install remains pending. |
| Real ISO build/boot test | Pending | v2.4 branding staged, requires user to run build with sudo. |
| v2.4 real ISO build validation | Pending | See `docs/REAL_ISO_BUILD_TEST.md`; requires user to run build. |
| v2.4 ISO VM boot validation | Pending | See `docs/ISO_VM_BOOT_TEST.md`; requires ISO artifact from user build. |
| v2.4 NetSentinel AI OS branding layer | Passed | Hostname, GRUB/ISOLINUX titles, issue, and MOTD fully configured. Ready for ISO test. |
| v2.6 Control Center Terminal Menu | Passed | `netsentinel-menu` implemented safely with whiptail/text fallback and desktop launcher. |
| v2.8 Visual Identity Activation | Passed | Plymouth, GRUB text, ISOLINUX text, MOTD, and desktop launchers visually integrated and aligned with v2.7 branding guidelines. |
| v2.9 ISO visual rebuild | Passed | Built `NetSentinel-AI-OS-Live-v2.9-visual-test.iso` from clean no-spaces build path; size `815792128` bytes; SHA256 `c1747ee48ff336840ec66adc3353187facf2c211837bbc9336afea26cce913b2`. |
| v2.9 QEMU visual boot validation | Passed | Boot splash and boot entries show NetSentinel AI OS / Start NetSentinel AI Live Appliance. Console auto-login reaches NetSentinel MOTD and hostname `netsentinel-ai`. Screenshots captured under `/tmp/netsentinel-v29-*.png`. |
| v2.9 VMware visual boot validation | Not tested | QEMU was used for local visual validation. VMware should be run manually before any external release claim. |
| v3.8 Professional Desktop Appliance source gate | Pending | XFCE/LightDM desktop profile staged with NetSentinel launchers, wallpaper placeholder, open console helper, NetworkManager UX, and no automatic browser/kiosk launch. Requires check-only, safety scans, ISO rebuild, and VM validation before marking passed. |
| v3.8 Graphical desktop validation | Not tested | Must verify LightDM auto-login, XFCE session, NetworkManager applet, desktop launchers, wallpaper, `open-netsentinel-console`, `netsentinel-menu`, and `appliance-status` in a rebuilt ISO. |
| v3.9 Desktop cleanup source gate | Pending | Obsolete kiosk/Openbox active artifacts removed or absent. Requires future ISO rebuild and VM validation before marking passed. |
| v4.0 Desktop ISO build | Passed | Built `NetSentinel-AI-OS-Desktop-v4.0-alpha.iso` from clean no-spaces build path; size `1.3G`; SHA256 `ea382d02ba749a7a084604b3dced40888226d9d35708c1ca553b2b94e87463c6`. |
| v4.0 Desktop ISO content verification | Passed | Boot labels, XFCE/LightDM/NetworkManager/browser/open-vm-tools manifest entries, staged wallpaper, desktop launchers, and appliance commands verified in binary tree/SquashFS. |
| v4.0 VMware visual validation | Not tested | VMware CLI exists, but GUI start did not produce a running VM from this Codex session. Manual VMware boot and screenshots are still required before any release claim. |
| v2.3-pre security audit gate | Passed | All critical/high code issues fixed. Remaining npm audit advisories explicitly accepted as Public Alpha lab-only risk. `.env` removed from repo root. pip-audit dependencies patched where safe. bandit clean at medium/high severity. See `docs/SECURITY_AUDIT_V2_3_PRE.md`. |
| Frontend dependency audit | Accepted | `next`/`eslint-config-next` at `14.2.35` (latest 14.x patch). 5 `npm audit` findings require Next 16 major migration — explicitly accepted for Public Alpha. |
| Python dependency audit | Passed | `python-jose` and `python-multipart` patched. Remaining findings are build/test tools or require major framework upgrade. |
| Bandit static analysis | Passed | 0 medium/high findings. 6 low-severity false positives documented. |

## Safety Checks

| Check | Status | Notes |
| --- | --- | --- |
| `.gitignore` excludes generated files and secrets | Passed | Includes env files, dumps, DB files, keys, tokens, backups, raw captures, live build artifacts. |
| `.env.example` and `.env.production.example` are placeholders | Passed | Safe to commit. |
| Local working `.env` absent | Passed | Moved to `~/netsentinel-private-config/.env.backup` during v2.3-pre gate. |
| Raw/unredacted captures excluded | Passed | Raw capture paths ignored. |
| Stale DB recovery documented | Passed | See `docs/DB_MIGRATION_RECOVERY.md`. |
| Live image forbidden payload scan | Passed | No secrets, `.env`, dumps, keys, tokens, or captures in `includes.chroot`. |
| v2.9 ISO payload scan | Passed | Final ISO content scan found no project `.env`, private keys, database dumps, or raw captures. Package/manual files containing the word `token` were OS documentation/library files, not project secrets. |

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
| Security audit v2.3-pre | Passed |
