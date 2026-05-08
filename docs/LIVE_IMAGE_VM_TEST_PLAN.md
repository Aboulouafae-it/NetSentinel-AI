# NetSentinel AI Live Image VM Test Plan

This checklist validates the prototype ISO in a VM. It is not a production
certification process yet.

## Build Host

Use a clean Debian Stable VM or host with:

- 4 CPU cores
- 8 GB RAM minimum
- 40 GB free disk for live-build cache/artifacts
- outbound apt access

Install build tools:

```bash
sudo apt-get update
sudo apt-get install -y live-build ca-certificates curl git
```

Build:

```bash
cd deploy/live-image
./build-live-prototype.sh --check-only
sudo ./build-live-prototype.sh --build
```

Expected artifact:

```text
deploy/live-image/live-image-amd64.hybrid.iso
```

## QEMU Boot

```bash
deploy/live-image/scripts/qemu-smoke-test.sh deploy/live-image/live-image-amd64.hybrid.iso
```

Open:

```text
http://localhost:3000/setup
```

The helper forwards host ports `3000` and `8000` to the guest.

## VirtualBox / VMware

Recommended VM settings:

- Debian 64-bit profile
- 2-4 CPUs
- 8 GB RAM
- NAT networking for simple setup, bridged networking for LAN device polling
- ISO attached as optical media
- Optional second NIC for management-network testing

Expected boot behavior:

- NetSentinel issue/MOTD text appears.
- Console references `netsentinel-appliance-status`.
- Desktop images may show the NetSentinel launcher if a desktop environment is
  included in the build.

## Appliance Status

Inside the VM:

```bash
sudo netsentinel-appliance-status
```

Expected healthy state after install/first boot:

- Docker present
- Compose services visible
- Backend health OK
- Frontend reachable
- Setup URL printed

If using bridged networking, find the VM IP:

```bash
ip addr
```

Then browse:

```text
http://<vm-ip>:3000/setup
```

## Troubleshooting

- If Docker is missing, confirm package list and apt repositories.
- If frontend is unreachable, run `docker compose ps` and backend/frontend logs.
- If setup redirects fail, check `.env.production` CORS and frontend API URL.
- If no persistence is configured, data disappears after reboot.
- If live-build fails on packages, check Debian repository availability for
  optional packages such as `tshark` or `snmp-mibs-downloader`.

## Known Limitations

- No persistence partition automation yet.
- No production boot splash.
- No signed release artifact.
- No hardware compatibility matrix.
- No automated browser test inside the VM yet.

## v2.1 Status

Boot testing is pending in the current environment. No ISO artifact exists
locally, and QEMU is not installed. Use `docs/REAL_ISO_BUILD_TEST.md` to produce
an ISO first, then run this VM boot plan.
