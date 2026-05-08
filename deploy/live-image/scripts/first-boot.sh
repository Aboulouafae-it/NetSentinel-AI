#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
ENV_FILE="${APP_ROOT}/.env.production"
LOG_DIR="/var/log/netsentinel"
LOG_FILE="${LOG_DIR}/first-boot.log"

mkdir -p "${LOG_DIR}" 2>/dev/null || true
touch "${LOG_FILE}" 2>/dev/null || true

log() {
  local message="[NetSentinel First Boot] $*"
  printf '%s\n' "${message}"
  printf '%s\n' "${message}" >>"${LOG_FILE}" 2>/dev/null || true
}

log "Starting NetSentinel AI live appliance prototype."

if ! command -v docker >/dev/null 2>&1; then
  log "Docker is not installed. Install docker.io and docker-compose-plugin, then run deploy/install-netsentinel.sh."
  exit 1
fi

if [[ ! -f "${APP_ROOT}/deploy/install-netsentinel.sh" ]]; then
  log "Application payload is not present at ${APP_ROOT}."
  log "Copy a NetSentinel AI release checkout to ${APP_ROOT}, then run this command again."
  exit 1
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  log "No appliance environment found. Running installer to initialize ${APP_ROOT}; installer will generate SECRET_KEY and preserve any existing env with backup."
  exec sudo "${APP_ROOT}/deploy/install-netsentinel.sh"
fi

log "Starting systemd services where available."
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl start docker || true
  sudo systemctl start netsentinel-compose.service || true
fi

if [[ -f "${APP_ROOT}/docker-compose.prod.yml" ]]; then
  docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" up -d
fi

log "Waiting briefly for local services."
sleep 5

if command -v netsentinel-appliance-status >/dev/null 2>&1; then
  netsentinel-appliance-status
else
  "${APP_ROOT}/deploy/live-image/scripts/appliance-status.sh" || true
fi

log "Open http://localhost:3000/setup"
