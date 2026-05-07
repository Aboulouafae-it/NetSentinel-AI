#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${APP_ROOT}/.env.production"

log() { printf '[NetSentinel Update] %s\n' "$*"; }
fail() { printf '[NetSentinel Update] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Run as root or with sudo."
[[ -f "${ENV_FILE}" ]] || fail "Missing ${ENV_FILE}; install first."

log "Creating pre-update backup."
NETSENTINEL_ROOT="${APP_ROOT}" "${APP_ROOT}/scripts/backup.sh"

log "Copying new application files while preserving .env.production and backups."
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'backups' --exclude '.env.production' "${SOURCE_DIR}/" "${APP_ROOT}/"
else
  cp -a "${SOURCE_DIR}/." "${APP_ROOT}/"
fi

log "Rebuilding and restarting containers."
docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" build
docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" up -d
docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" exec -T backend alembic upgrade head

log "Verifying health endpoint."
if docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).read()"; then
  log "Update complete and health check passed."
else
  fail "Health check failed. Review docker compose logs. Roll back by restoring the pre-update backup with scripts/restore.sh."
fi
