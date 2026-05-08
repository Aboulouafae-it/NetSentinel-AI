# NetSentinel AI ISO VM Boot Test

This document validates a built NetSentinel AI prototype ISO in QEMU,
VirtualBox, or VMware. It is not a production certification process.

## Current v2.1 Status

Status: **Pending in this environment**.

No ISO artifact exists locally and QEMU is not installed on the current host, so
boot testing was not run.

## Prerequisites

- A built ISO from `docs/REAL_ISO_BUILD_TEST.md`
- 4 vCPUs recommended
- 8 GB RAM minimum
- NAT networking for basic setup
- Bridged networking only when validating LAN device polling

Expected ISO path:

```text
deploy/live-image/live-image-amd64.hybrid.iso
```

## QEMU Smoke Test

If QEMU is installed:

```bash
deploy/live-image/scripts/qemu-smoke-test.sh deploy/live-image/live-image-amd64.hybrid.iso
```

Manual QEMU example:

```bash
qemu-system-x86_64 \
  -m 8192 \
  -smp 4 \
  -cdrom deploy/live-image/live-image-amd64.hybrid.iso \
  -boot d \
  -netdev user,id=net0,hostfwd=tcp::3000-:3000,hostfwd=tcp::8000-:8000 \
  -device virtio-net-pci,netdev=net0 \
  -serial mon:stdio
```

Then open from the host:

```text
http://localhost:3000/setup
```

## VirtualBox

1. Create a new Debian 64-bit VM.
2. Assign 2-4 CPUs and 8 GB RAM.
3. Attach the ISO as optical media.
4. Use NAT networking for basic setup or bridged networking for LAN testing.
5. Boot the VM.
6. If using bridged networking, run `ip addr` inside the VM and open:

```text
http://<vm-ip>:3000/setup
```

## VMware

1. Create a Linux/Debian 64-bit VM.
2. Assign 2-4 CPUs and 8 GB RAM.
3. Attach the ISO.
4. Use NAT or bridged networking.
5. Boot and validate the console/MOTD and appliance status.

## Appliance Status

Inside the VM, run whichever helper is available:

```bash
sudo netsentinel-appliance-status
```

or:

```bash
sudo /opt/netsentinel/deploy/live-image/scripts/appliance-status.sh
```

Expected healthy behavior:

- NetSentinel branding/MOTD appears.
- First-boot script runs or clearly reports what is missing.
- Docker is installed and available.
- Compose services are visible after installation.
- Backend health is OK.
- Frontend is reachable.
- Setup URL is printed.

## Logs To Collect

```bash
sudo journalctl -b --no-pager -n 300
sudo journalctl -u netsentinel-compose.service --no-pager -n 200
sudo docker ps
sudo docker compose --env-file /opt/netsentinel/.env.production -f /opt/netsentinel/docker-compose.prod.yml logs --tail=200
sudo tail -n 200 /var/log/netsentinel/*.log 2>/dev/null || true
```

## Known Limitations

- No persistence partition automation yet.
- No production boot splash.
- No signed ISO artifact.
- No hardware compatibility matrix.
- No automated browser test inside the VM yet.
- Docker and first-boot behavior must be validated after boot; ISO build success
  alone is not enough.

## Result Template

```text
ISO path:
ISO size:
VM tool: QEMU / VirtualBox / VMware
Network mode:
Boot result: Passed / Failed
Branding/MOTD result: Passed / Failed
First-boot result: Passed / Failed
Appliance status result: Passed / Failed
Setup URL reachable: Passed / Failed
Notes:
```
