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
  "${ROOT_DIR}/../../deploy/install-netsentinel.sh"
  "${ROOT_DIR}/../../docker-compose.prod.yml"
)

required_packages=(
  systemd
  docker.io
  docker-compose-plugin
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
  lldpd
  rsyslog
  chrony
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

for file in "${required_files[@]}"; do
  [[ -f "${file}" ]] || { echo "Missing required file: ${file}" >&2; exit 1; }
done

bash -n "${ROOT_DIR}/scripts/first-boot.sh"
bash -n "${ROOT_DIR}/scripts/appliance-status.sh"
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
  echo "Prototype validation passed; build skipped."
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
  echo "Prototype validation passed. Re-run with --build to invoke live-build."
  exit 0
fi

cat <<SUMMARY
NetSentinel AI Live Image Prototype Build
=========================================
Root: ${ROOT_DIR}
Base: Debian Bookworm live-build scaffold
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

cd "${ROOT_DIR}"
lb config
lb build
