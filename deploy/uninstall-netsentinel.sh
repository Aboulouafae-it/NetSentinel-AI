#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
ENV_FILE="${APP_ROOT}/.env.production"
PURGE=false

if [[ "${1:-}" == "--purge" ]]; then
  PURGE=true
fi

log() { printf '[NetSentinel Uninstall] %s\n' "$*"; }
fail() { printf '[NetSentinel Uninstall] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Run as root or with sudo."

log "Stopping services."
systemctl disable --now netsentinel-backup.timer 2>/dev/null || true
systemctl disable --now netsentinel-compose.service 2>/dev/null || true
if [[ -f "${ENV_FILE}" && -f "${APP_ROOT}/docker-compose.prod.yml" ]]; then
  docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" down || true
fi

rm -f /etc/systemd/system/netsentinel-compose.service /etc/systemd/system/netsentinel-backup.service /etc/systemd/system/netsentinel-backup.timer
systemctl daemon-reload

if [[ "${PURGE}" == "true" ]]; then
  echo "WARNING: --purge removes application files and local appliance data." >&2
  echo "Press Ctrl+C within 10 seconds to abort." >&2
  sleep 10
  rm -rf "${APP_ROOT}" /var/lib/netsentinel /var/log/netsentinel
  log "Purged application and data directories."
else
  log "Uninstalled services. Data preserved in ${APP_ROOT}, /var/lib/netsentinel, and /var/log/netsentinel."
  log "Re-run with --purge to remove data intentionally."
fi
