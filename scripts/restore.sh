#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/restore.sh /path/to/netsentinel-backup-*.tar.gz [--yes]" >&2
  exit 2
fi

ARCHIVE="$1"
CONFIRM="${2:-}"
SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="${NETSENTINEL_ROOT:-/opt/netsentinel}"
if [[ ! -d "${ROOT_DIR}" && -f "${SCRIPT_ROOT}/docker-compose.prod.yml" ]]; then
  ROOT_DIR="${SCRIPT_ROOT}"
fi
COMPOSE_FILE="${NETSENTINEL_COMPOSE_FILE:-${ROOT_DIR}/docker-compose.prod.yml}"
ENV_FILE="${NETSENTINEL_ENV_FILE:-${ROOT_DIR}/.env.production}"
REPORTS_DIR="${REPORTS_DIR:-${ROOT_DIR}/reports}"
LOG_DIR="${NETSENTINEL_LOG_DIR:-/var/log/netsentinel}"
DATA_DIR="${NETSENTINEL_DATA_DIR:-/var/lib/netsentinel}"
RESTORE_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "${RESTORE_DIR}"
}
trap cleanup EXIT

if [[ "${CONFIRM}" != "--yes" ]]; then
  echo "Restore will replace the current PostgreSQL database. Re-run with --yes to continue." >&2
  exit 3
fi

tar -xzf "${ARCHIVE}" -C "${RESTORE_DIR}"
BACKUP_ROOT="$(find "${RESTORE_DIR}" -maxdepth 1 -type d -name 'netsentinel-backup-*' | head -n 1)"
if [[ ! -f "${BACKUP_ROOT}/postgres.sql" ]]; then
  echo "Backup archive does not contain postgres.sql" >&2
  exit 4
fi

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER:-netsentinel}" -d "${POSTGRES_DB:-netsentinel}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres psql -U "${POSTGRES_USER:-netsentinel}" -d "${POSTGRES_DB:-netsentinel}" < "${BACKUP_ROOT}/postgres.sql"

if [[ -f "${BACKUP_ROOT}/storage.tar.gz" ]]; then
  tar -C "${ROOT_DIR}" -xzf "${BACKUP_ROOT}/storage.tar.gz"
fi
if [[ -f "${BACKUP_ROOT}/reports.tar.gz" ]]; then
  mkdir -p "$(dirname "${REPORTS_DIR}")"
  tar -C "$(dirname "${REPORTS_DIR}")" -xzf "${BACKUP_ROOT}/reports.tar.gz"
fi
if [[ -f "${BACKUP_ROOT}/data.tar.gz" ]]; then
  mkdir -p "$(dirname "${DATA_DIR}")"
  tar -C "$(dirname "${DATA_DIR}")" -xzf "${BACKUP_ROOT}/data.tar.gz"
fi
if [[ -f "${BACKUP_ROOT}/logs.tar.gz" ]]; then
  mkdir -p "$(dirname "${LOG_DIR}")"
  tar -C "$(dirname "${LOG_DIR}")" -xzf "${BACKUP_ROOT}/logs.tar.gz"
fi

echo "Restore complete from ${ARCHIVE}"
