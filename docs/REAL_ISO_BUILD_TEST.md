# NetSentinel AI Real ISO Build Test

This document describes how to validate whether the Debian live appliance
scaffold can produce a real prototype ISO. A successful build does not make the
ISO production-ready; boot and persistence testing are separate checks.

## Current v2.1 Status

Status: **Pending in this environment**.

The current host does not have `live-build` installed, so only
`deploy/live-image/build-live-prototype.sh --check-only` was run locally. The
real ISO build should be run in a clean Debian Stable build VM.

## Recommended Build Host

- Debian Stable
- 4 vCPUs
- 8 GB RAM minimum
- 40 GB free disk minimum
- Internet access to Debian package repositories
- No secrets, `.env`, database dumps, backups, or raw captures in the build tree

Install tooling:

```bash
sudo apt-get update
sudo apt-get install -y live-build ca-certificates curl git
```

Clone the repository:

```bash
git clone https://github.com/Aboulouafae-it/NetSentinel-AI.git "NetSentinel AI"
cd "NetSentinel AI"
```

## Check-Only Validation

```bash
cd deploy/live-image
./build-live-prototype.sh --check-only
```

Expected result:

```text
Prototype validation passed
```

If `live-build` is missing, the check should print installation guidance and
skip the build.

## Build The Prototype ISO

```bash
cd deploy/live-image
sudo ./build-live-prototype.sh --build
```

When prompted, type:

```text
yes
```

Expected artifact:

```text
deploy/live-image/live-image-amd64.hybrid.iso
```

Some `live-build` configurations may produce:

```text
deploy/live-image/live-image-amd64.iso
```

Record artifact size:

```bash
ls -lh live-image-amd64*.iso live-image-amd64*.hybrid.iso 2>/dev/null
```

Do not claim ISO build success unless the artifact exists.

## Cleanup

```bash
cd deploy/live-image
sudo ./build-live-prototype.sh --clean
```

The wrapper prompts before invoking `lb clean`.

## Troubleshooting

### `live-build` missing

```bash
sudo apt-get update
sudo apt-get install -y live-build
```

### Package unavailable

- Confirm Debian release and repositories.
- Check `deploy/live-image/package-lists/netsentinel.list.chroot`.
- Temporarily remove optional packages only after documenting the change.

### Disk space

Live builds can consume many gigabytes of cache/artifacts.

```bash
df -h
sudo ./build-live-prototype.sh --clean
```

### Permissions

Builds usually need root:

```bash
sudo ./build-live-prototype.sh --build
```

### Docker inside live image limitations

The prototype image includes Docker packages, but Docker behavior must be
validated after boot. Do not assume nested Docker or appliance services are
healthy until `appliance-status.sh` confirms them inside a VM.

## Result Template

```text
Build OS:
live-build version:
Repository commit:
Check-only result: Passed / Failed
Build result: Passed / Failed / Not run
Artifact path:
Artifact size:
Cleanup result: Passed / Failed / Not run
Notes:
```
