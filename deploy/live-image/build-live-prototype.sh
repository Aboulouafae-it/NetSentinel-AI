#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK_ONLY=false
DO_BUILD=false
DO_CLEAN=false

usage() {
  cat <<'USAGE'
Usage: build-live-prototype.sh [--check-only] [--build] [--clean]

--check-only  Validate prototype files and tooling hints without building.
--build       Run live-build if installed. This may require sudo/root.
--clean       Run live-build clean if installed, after confirmation.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check-only) CHECK_ONLY=true ;;
    --build) DO_BUILD=true ;;
    --clean) DO_CLEAN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

required_files=(
  "${ROOT_DIR}/README.md"
  "${ROOT_DIR}/auto/config"
  "${ROOT_DIR}/package-lists/netsentinel.list.chroot"
  "${ROOT_DIR}/scripts/first-boot.sh"
  "${ROOT_DIR}/scripts/appliance-status.sh"
  "${ROOT_DIR}/scripts/open-netsentinel-console.sh"
  "${ROOT_DIR}/scripts/netsentinel-menu.sh"
  "${ROOT_DIR}/../../deploy/install-netsentinel.sh"
  "${ROOT_DIR}/../../docker-compose.prod.yml"
)

required_packages=(
  systemd
  docker.io
  docker-compose
  git
  curl
  jq
  ca-certificates
  openssl
  network-manager
  nmap
  fping
  arp-scan
  snmp
  tcpdump
  iperf3
  mtr
  traceroute
  dnsutils
  whois
  ethtool
  iputils-ping
  pciutils
  usbutils
  iw
  wireless-tools
  rfkill
  lldpd
  rsyslog
  chrony
  xorg
  lightdm
  xfce4
  xfce4-terminal
  thunar
  chromium
  firefox-esr
  dbus-x11
  xdg-utils
  network-manager-gnome
  polkitd
  fonts-dejavu
  fonts-noto-core
  open-vm-tools
  firmware-linux-free
)

forbidden_patterns=(
  ".env"
  ".env.production"
  "*.pem"
  "*.key"
  "*.token"
  "*.secret"
  "*.dump"
  "*.sql"
  "*.sqlite"
  "*.db"
  "*raw*"
  "*capture*"
)

brand_binary_boot_menus() {
  local boot_dirs=()

  for dir in binary/boot binary/isolinux; do
    if [[ -d "${dir}" ]]; then
      boot_dirs+=("${dir}")
    fi
  done

  if [[ "${#boot_dirs[@]}" -eq 0 ]]; then
    echo "No binary boot menu directories found to brand."
    return 0
  fi

  echo "Applying NetSentinel AI OS boot menu labels in binary image tree."
  find "${boot_dirs[@]}" -type f -name "*.cfg" -exec sed -i 's/Live system (amd64 fail-safe mode)/Start NetSentinel AI Live Appliance (safe mode)/g' {} +
  find "${boot_dirs[@]}" -type f -name "*.cfg" -exec sed -i 's/\^Live system (amd64)/\^Start NetSentinel AI Live Appliance/g' {} +
  find "${boot_dirs[@]}" -type f -name "*.cfg" -exec sed -i 's/Live system (amd64)/Start NetSentinel AI Live Appliance/g' {} +
  find "${boot_dirs[@]}" -type f -name "*.cfg" -exec sed -i 's/menu title Boot menu/menu title NetSentinel AI OS/g' {} +
}

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || { echo "Missing required file: ${file}" >&2; exit 1; }
done

bash -n "${ROOT_DIR}/scripts/first-boot.sh"
bash -n "${ROOT_DIR}/scripts/appliance-status.sh"
bash -n "${ROOT_DIR}/scripts/open-netsentinel-console.sh"
bash -n "${ROOT_DIR}/scripts/netsentinel-menu.sh"
bash -n "${ROOT_DIR}/auto/config"

package_file="${ROOT_DIR}/package-lists/netsentinel.list.chroot"
for package in "${required_packages[@]}"; do
  if ! grep -E "^[[:space:]]*${package}[[:space:]]*$" "${package_file}" >/dev/null; then
    echo "Missing required package in ${package_file}: ${package}" >&2
    exit 1
  fi
done

includes_dir="${ROOT_DIR}/includes.chroot"
for pattern in "${forbidden_patterns[@]}"; do
  if find "${includes_dir}" -name "${pattern}" -print -quit | grep -q .; then
    echo "Forbidden file pattern found in live image includes: ${pattern}" >&2
    find "${includes_dir}" -name "${pattern}" -print >&2
    exit 1
  fi
done

if grep -RIE "(SECRET_KEY=|POSTGRES_PASSWORD=|BEGIN .*PRIVATE KEY|TOKEN=|PASSWORD=)" "${includes_dir}" >/dev/null 2>&1; then
  echo "Potential secret-like content found in live image includes." >&2
  exit 1
fi

if ! command -v lb >/dev/null 2>&1; then
  echo "live-build is not installed."
  echo "Install on Debian with: sudo apt-get update && sudo apt-get install -y live-build"
  echo "Prototype validation passed for NetSentinel AI OS; build skipped."
  exit 0
fi

echo "live-build found: $(lb --version | head -n 1)"

if [[ "${DO_CLEAN}" == "true" ]]; then
  echo "About to run live-build clean in ${ROOT_DIR}."
  read -r -p "Continue with clean? Type 'yes' to continue: " clean_answer
  if [[ "${clean_answer}" != "yes" ]]; then
    echo "Clean cancelled."
    exit 0
  fi
  cd "${ROOT_DIR}"
  lb clean
  echo "Clean complete."
  exit 0
fi

if [[ "${CHECK_ONLY}" == "true" || "${DO_BUILD}" != "true" ]]; then
  echo "Prototype validation passed for NetSentinel AI OS. Re-run with --build to invoke live-build."
  exit 0
fi

cat <<SUMMARY
NetSentinel AI OS Live Appliance Prototype Build
=========================================
Root: ${ROOT_DIR}
Technical base: Debian Bookworm live-build scaffold
User-facing OS identity: NetSentinel AI OS
ISO label: NETSENTINEL_AI
Default hostname: netsentinel-ai
Payload strategy: installer/bootstrap only; no .env, database, tokens, or real captures
Expected artifact: ${ROOT_DIR}/live-image-amd64.hybrid.iso or live-image-amd64.iso
SUMMARY

echo "About to run live-build in ${ROOT_DIR}."
echo "This is non-destructive to disks, but it can download packages and create build artifacts."
read -r -p "Continue with live-build? Type 'yes' to continue: " answer
if [[ "${answer}" != "yes" ]]; then
  echo "Build cancelled."
  exit 0
fi

BUILD_ROOT="${ROOT_DIR}"
TEMP_BUILD_ROOT=""

if [[ "${ROOT_DIR}" == *" "* ]]; then
  TEMP_BUILD_ROOT="/tmp/netsentinel-live-build-$$"
  echo "live-build cannot build from a path containing spaces."
  echo "Staging NetSentinel AI OS live-image tree in ${TEMP_BUILD_ROOT}."
  mkdir -p "${TEMP_BUILD_ROOT}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a \
      --exclude '/chroot/' \
      --exclude '/binary/' \
      --exclude '/cache/' \
        \
      --exclude '/local/' \
      --exclude '/live-image-*.iso' \
      --exclude '/*.hybrid.iso' \
      --exclude '/*.img' \
      "${ROOT_DIR}/" "${TEMP_BUILD_ROOT}/"
  else
    cp -a "${ROOT_DIR}/." "${TEMP_BUILD_ROOT}/"
  fi
  BUILD_ROOT="${TEMP_BUILD_ROOT}"
fi

cd "${BUILD_ROOT}"
./auto/config

if [ -d "${ROOT_DIR}/package-lists" ]; then
    mkdir -p config/package-lists
    cp -a "${ROOT_DIR}/package-lists/"* config/package-lists/ || true
fi

if [ -d "${ROOT_DIR}/includes.chroot" ]; then
    mkdir -p config/includes.chroot_after_packages
    cp -a "${ROOT_DIR}/includes.chroot/." config/includes.chroot_after_packages/
fi

if [ -d "${ROOT_DIR}/hooks/normal" ]; then
    mkdir -p config/hooks/normal
    cp -a "${ROOT_DIR}/hooks/normal/"* config/hooks/normal/ || true
fi

if [ -d "${ROOT_DIR}/hooks/live" ]; then
    mkdir -p config/hooks/live
    cp -a "${ROOT_DIR}/hooks/live/"* config/hooks/live/ || true
fi

if [ -d "${ROOT_DIR}/bootloaders" ]; then
    cp -r "${ROOT_DIR}/bootloaders/"* config/bootloaders/ || true
fi

lb build

brand_binary_boot_menus
if [[ -d binary ]]; then
  lb binary_iso --force
fi

if [[ -n "${TEMP_BUILD_ROOT}" ]]; then
  found_artifact=false
  for artifact in "${BUILD_ROOT}"/live-image-amd64*.iso "${BUILD_ROOT}"/live-image-amd64*.hybrid.iso; do
    if [[ -f "${artifact}" ]]; then
      cp "${artifact}" "${ROOT_DIR}/"
      found_artifact=true
    fi
  done
  if [[ "${found_artifact}" != "true" ]]; then
    echo "Build completed, but no expected ISO artifact was found in ${BUILD_ROOT}." >&2
    exit 1
  fi
  echo "Copied ISO artifact(s) back to ${ROOT_DIR}."
fi
