# NetSentinel AI OS Real ISO Build Test

This document describes how to validate whether the NetSentinel AI OS live
appliance scaffold can produce a real prototype ISO. A successful build does not
make the ISO production-ready; boot and persistence testing are separate checks.

## Current v2.9 Status

Status: **Built and content-verified**.

The v2.9 visual-test ISO was built successfully from:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image
```

Final artifact:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image/NetSentinel-AI-OS-Live-v2.9-visual-test.iso
Size: 815792128 bytes
SHA256: c1747ee48ff336840ec66adc3353187facf2c211837bbc9336afea26cce913b2
```

Build and verification summary:

- `./build-live-prototype.sh --check-only`: passed.
- Bash syntax checks for live image scripts/hooks: passed.
- Forbidden payload scan: passed for live image includes.
- Real ISO build: passed.
- ISO bootloader config verification: passed.
- SquashFS identity files and helper binaries: passed.
- QEMU visual boot validation: passed.
- VMware validation: not run in this environment.

The build wrapper now stages live-build package lists, chroot includes, hooks,
and bootloader assets into `config/`, then post-processes generated binary boot
menus before regenerating the ISO. This prevents live-build timing from leaving
generic boot labels in the final ISO.

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

Expected ISO label:

```text
NETSENTINEL_AI
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

For the v2.9 visual-test release, also copy the successful build artifact to:

```bash
cp live-image-amd64.hybrid.iso NetSentinel-AI-OS-Live-v2.9-visual-test.iso
sha256sum NetSentinel-AI-OS-Live-v2.9-visual-test.iso > SHA256SUMS
```

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

### Docker inside NetSentinel AI OS image limitations

The prototype image includes Docker packages, but Docker behavior must be
validated after boot. Do not assume nested Docker or appliance services are
healthy until `appliance-status.sh` confirms them inside a VM.

## Technical Base Attribution

NetSentinel AI OS is an independent Debian-based system. Debian is a trademark
of Software in the Public Interest, Inc. NetSentinel AI is not produced by,
endorsed by, or affiliated with the Debian Project.

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
