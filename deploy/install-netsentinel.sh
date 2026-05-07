#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
BACKUP_DIR="${APP_ROOT}/backups"
REPORTS_DIR="${APP_ROOT}/reports"
APP_LOG_DIR="${APP_ROOT}/logs"
DATA_DIR="/var/lib/netsentinel"
VAR_LOG_DIR="/var/log/netsentinel"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${APP_ROOT}/.env.production"

log() { printf '[NetSentinel Installer] %s\n' "$*"; }
fail() { printf '[NetSentinel Installer] ERROR: %s\n' "$*" >&2; exit 1; }
need_root() { [[ "${EUID}" -eq 0 ]] || fail "Run as root or with sudo."; }

detect_debian() {
  [[ -f /etc/os-release ]] || fail "Cannot detect OS: /etc/os-release missing."
  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}:${ID_LIKE:-}" in
    debian:*|ubuntu:*|*:debian*) return 0 ;;
    *) fail "This prototype installer supports Debian/Ubuntu-like systems. Detected: ${PRETTY_NAME:-unknown}" ;;
  esac
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker and Docker Compose plugin found."
    return
  fi
  log "Docker or Docker Compose plugin is missing."
  if command -v apt-get >/dev/null 2>&1; then
    log "Install Docker with: apt-get update && apt-get install -y docker.io docker-compose-plugin"
  fi
  fail "Install Docker Engine and the compose plugin, then re-run this installer."
}

copy_tree() {
  mkdir -p "${APP_ROOT}" "${BACKUP_DIR}" "${REPORTS_DIR}" "${APP_LOG_DIR}" "${DATA_DIR}" "${VAR_LOG_DIR}"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete --exclude '.git' --exclude 'node_modules' --exclude '.next' --exclude 'backups' "${SOURCE_DIR}/" "${APP_ROOT}/"
  else
    cp -a "${SOURCE_DIR}/." "${APP_ROOT}/"
  fi
}

generate_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    local stamp
    stamp="$(date -u +%Y%m%dT%H%M%SZ)"
    cp "${ENV_FILE}" "${ENV_FILE}.backup-${stamp}"
    log "Existing .env.production preserved and backed up to ${ENV_FILE}.backup-${stamp}"
    return
  fi
  cp "${APP_ROOT}/.env.production.example" "${ENV_FILE}"
  local secret
  local pg_password
  secret="$(openssl rand -hex 48)"
  pg_password="$(openssl rand -hex 24)"
  sed -i "s|SECRET_KEY=change-me-with-a-long-random-secret|SECRET_KEY=${secret}|" "${ENV_FILE}"
  sed -i "s|POSTGRES_PASSWORD=change-me-postgres-password|POSTGRES_PASSWORD=${pg_password}|" "${ENV_FILE}"
  sed -i "s|change-me-postgres-password@postgres|${pg_password}@postgres|" "${ENV_FILE}"
  sed -i "s|BUILD_DATE=|BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)|" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
  log "Created ${ENV_FILE}. Review hostname, CORS_ORIGINS, and NEXT_PUBLIC_API_URL before exposing the appliance."
}

install_systemd() {
  cp "${APP_ROOT}/deploy/systemd/netsentinel-compose.service" /etc/systemd/system/
  cp "${APP_ROOT}/deploy/systemd/netsentinel-backup.service" /etc/systemd/system/
  cp "${APP_ROOT}/deploy/systemd/netsentinel-backup.timer" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable netsentinel-compose.service
  systemctl enable netsentinel-backup.timer
}

start_stack() {
  docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" build
  docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" up -d
  docker compose --env-file "${ENV_FILE}" -f "${APP_ROOT}/docker-compose.prod.yml" exec -T backend alembic upgrade head
  systemctl restart netsentinel-compose.service
  systemctl start netsentinel-backup.timer
}

main() {
  need_root
  detect_debian
  require_command cp
  require_command openssl
  require_command sed
  require_command systemctl
  ensure_docker
  log "Installing NetSentinel AI into ${APP_ROOT}"
  copy_tree
  generate_env
  install_systemd
  start_stack
  log "Install complete."
  log "Open http://localhost:3000/setup for first-run setup."
}

main "$@"
