#!/usr/bin/env bash
set -euo pipefail

ISO_PATH="${1:-}"

if [[ -z "${ISO_PATH}" ]]; then
  cat <<'USAGE'
Usage: qemu-smoke-test.sh path/to/live-image-amd64.hybrid.iso

Boots the NetSentinel AI OS prototype ISO in QEMU with user-mode networking and a serial console.
Stop the VM from the QEMU monitor or close the window.

Example:
  qemu-system-x86_64 -m 4096 -smp 2 -cdrom live-image-amd64.hybrid.iso -boot d -netdev user,id=n0,hostfwd=tcp::3000-:3000,hostfwd=tcp::8000-:8000 -device e1000,netdev=n0
USAGE
  exit 2
fi

if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
  echo "qemu-system-x86_64 is not installed."
  echo "Install on Debian with: sudo apt-get install -y qemu-system-x86"
  exit 1
fi

if [[ ! -f "${ISO_PATH}" ]]; then
  echo "ISO not found: ${ISO_PATH}" >&2
  exit 1
fi

echo "Booting NetSentinel AI OS prototype ISO:"
echo "  ${ISO_PATH}"
echo "Forwarded ports:"
echo "  host 3000 -> guest 3000"
echo "  host 8000 -> guest 8000"
echo "After boot, open NetSentinel AI Console: http://localhost:3000/setup"

exec qemu-system-x86_64 \
  -m 4096 \
  -smp 2 \
  -cdrom "${ISO_PATH}" \
  -boot d \
  -serial stdio \
  -netdev user,id=n0,hostfwd=tcp::3000-:3000,hostfwd=tcp::8000-:8000 \
  -device e1000,netdev=n0
