# NetSentinel AI OS ISO VM Boot Test

This document validates a built NetSentinel AI OS prototype ISO in QEMU,
VirtualBox, or VMware. It is not a production certification process.

## Current v2.9 Status

Status: **QEMU visual validation passed; VMware manual validation still pending**.

The v2.9 visual-test ISO was rebuilt from a no-spaces build path and validated
with QEMU framebuffer captures. The boot splash and boot menu now present
NetSentinel AI OS as the user-facing identity, without Debian/Kali/Ubuntu/vendor
product branding. Console auto-login reached the NetSentinel MOTD, and the
hostname resolved to `netsentinel-ai`.

Artifact:

```text
/home/emorphi/netsentinel-build/NetSentinel-AI/deploy/live-image/NetSentinel-AI-OS-Live-v2.9-visual-test.iso
Size: 815792128 bytes
SHA256: c1747ee48ff336840ec66adc3353187facf2c211837bbc9336afea26cce913b2
```

Captured QEMU screenshots:

```text
/tmp/netsentinel-v29-boot-menu-final.png
/tmp/netsentinel-v29-console.png
/tmp/netsentinel-v29-hostname.png
```

Remaining cosmetic gap: the pre-login `issue.net-sentinel` line contains a
literal `\n` escape sequence that login expands into the hostname, producing a
cramped `Console: tty...` line before auto-login. The MOTD and runtime prompt
are correct.

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

Expected user-facing identity:

- Boot/menu title: NetSentinel AI OS
- Live edition: NetSentinel AI Live Appliance
- Hostname: `netsentinel-ai`
- Console URL: `http://<vm-ip>:3000/setup`

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

1. Create a new Linux 64-bit VM.
2. Assign 2-4 CPUs and 8 GB RAM.
3. Attach the ISO as optical media.
4. Use NAT networking for basic setup or bridged networking for LAN testing.
5. Boot the VM.
6. If using bridged networking, run `ip addr` inside the VM and open:

```text
http://<vm-ip>:3000/setup
```

## VMware

1. Create a Linux 64-bit VM.
2. Assign 2-4 CPUs and 8 GB RAM.
3. Attach the ISO.
4. Use NAT or bridged networking.
5. Boot and validate the console/MOTD and appliance status.

v2.9 note: VMware validation was not performed in this environment. QEMU visual
validation was performed instead using the final ISO above.

## v2.10 Automatic Console Validation

After rebuilding the ISO with v2.10 changes, validate the graphical appliance
experience:

1. Boot the ISO.
2. Confirm LightDM auto-login enters `NetSentinel AI OS`.
3. Confirm the Openbox session starts without generic distribution branding.
4. Confirm the NetSentinel AI Console opens automatically.
5. Confirm the first target is `http://localhost:3000/setup`.
6. If services are not ready, confirm the waiting screen/log appears.
7. After timeout, confirm the recovery menu offers:
   - retry console,
   - Appliance Status,
   - Control Center,
   - URL display,
   - shell exit.
8. Confirm Ethernet DHCP works.
9. Confirm WiFi can be selected through NetworkManager without baked credentials.
10. Confirm console fallback still works with `netsentinel-menu` and
    `appliance-status`.

Expected commands inside the VM:

```bash
which netsentinel-kiosk
which netsentinel-menu
which appliance-status
systemctl status lightdm --no-pager
systemctl status NetworkManager --no-pager
```

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
- No Debian artwork or Debian branding appears as the product identity.
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
- v2.9 has a branded prototype boot splash; final commercial artwork is still
  pending.
- No signed ISO artifact.
- No hardware compatibility matrix.
- No automated browser test inside the VM yet.
- v2.10 kiosk mode requires a rebuilt ISO and VM validation; source staging is
  implemented, but this document should not be treated as proof of a booted
  v2.10 ISO until the rebuild is performed.
- Docker and first-boot behavior must be validated after boot; ISO build success
  alone is not enough.

## Technical Base Attribution

NetSentinel AI OS is an independent Debian-based system. Debian is a trademark
of Software in the Public Interest, Inc. NetSentinel AI is not produced by,
endorsed by, or affiliated with the Debian Project.

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
