#!/usr/bin/env bash
set -euo pipefail

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="${NETSENTINEL_ROOT:-/opt/netsentinel}"
if [[ ! -d "${ROOT_DIR}" && -f "${SCRIPT_ROOT}/docker-compose.prod.yml" ]]; then
  ROOT_DIR="${SCRIPT_ROOT}"
fi
BACKUP_DIR="${BACKUP_DIR:-${ROOT_DIR}/backups}"
REPORTS_DIR="${REPORTS_DIR:-${ROOT_DIR}/reports}"
LOG_DIR="${NETSENTINEL_LOG_DIR:-/var/log/netsentinel}"
DATA_DIR="${NETSENTINEL_DATA_DIR:-/var/lib/netsentinel}"
COMPOSE_FILE="${NETSENTINEL_COMPOSE_FILE:-${ROOT_DIR}/docker-compose.prod.yml}"
ENV_FILE="${NETSENTINEL_ENV_FILE:-${ROOT_DIR}/.env.production}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="${BACKUP_DIR}/netsentinel-backup-${STAMP}"

if [[ "${1:-}" == "--dry-run" ]]; then
  echo "Would create backup in ${WORK_DIR}"
  echo "Would use compose file ${COMPOSE_FILE}"
  echo "Would include reports from ${REPORTS_DIR}, logs from ${LOG_DIR}, and data from ${DATA_DIR} when present"
  exit 0
fi

mkdir -p "${WORK_DIR}"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U "${POSTGRES_USER:-netsentinel}" "${POSTGRES_DB:-netsentinel}" > "${WORK_DIR}/postgres.sql"

if [[ -f "${ENV_FILE}" ]]; then
  cp "${ENV_FILE}" "${WORK_DIR}/env.production"
fi
if [[ -d "${ROOT_DIR}/storage" ]]; then
  tar -C "${ROOT_DIR}" -czf "${WORK_DIR}/storage.tar.gz" storage
fi
if [[ -d "${REPORTS_DIR}" ]]; then
  tar -C "$(dirname "${REPORTS_DIR}")" -czf "${WORK_DIR}/reports.tar.gz" "$(basename "${REPORTS_DIR}")"
fi
if [[ -d "${DATA_DIR}" ]]; then
  tar -C "$(dirname "${DATA_DIR}")" -czf "${WORK_DIR}/data.tar.gz" "$(basename "${DATA_DIR}")"
fi
if [[ -d "${LOG_DIR}" ]]; then
  tar -C "$(dirname "${LOG_DIR}")" -czf "${WORK_DIR}/logs.tar.gz" "$(basename "${LOG_DIR}")"
fi

cat > "${WORK_DIR}/metadata.json" <<META
{"created_at":"${STAMP}","app":"NetSentinel AI","version":"v1.0","compose_file":"${COMPOSE_FILE}","root":"${ROOT_DIR}"}
META

tar -C "${BACKUP_DIR}" -czf "${BACKUP_DIR}/netsentinel-backup-${STAMP}.tar.gz" "netsentinel-backup-${STAMP}"
rm -rf "${WORK_DIR}"
echo "Backup written to ${BACKUP_DIR}/netsentinel-backup-${STAMP}.tar.gz"
