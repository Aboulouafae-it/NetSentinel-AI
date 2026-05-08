#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"

DB_NAME="${NETSENTINEL_VALIDATE_DB:-netsentinel_clean_migration_check}"
DB_USER="${NETSENTINEL_VALIDATE_USER:-netsentinel}"
DB_PASSWORD="${NETSENTINEL_VALIDATE_PASSWORD:-netsentinel_validation_password}"
POSTGRES_IMAGE="${NETSENTINEL_VALIDATE_POSTGRES_IMAGE:-postgres:16-alpine}"
PYTHON_BIN="${NETSENTINEL_VALIDATE_PYTHON:-python}"
CONTAINER_NAME="netsentinel-migration-check-$RANDOM-$$"

log() {
  printf '[validate-clean-migrations] %s\n' "$*"
}

fail() {
  printf '[validate-clean-migrations] ERROR: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

cleanup() {
  if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
    docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

need_cmd docker
need_cmd "${PYTHON_BIN}"

if [[ ! -f "${BACKEND_DIR}/alembic.ini" ]]; then
  fail "Could not find backend/alembic.ini from ${ROOT_DIR}"
fi

log "Starting isolated PostgreSQL container ${CONTAINER_NAME}"
docker run \
  --rm \
  --name "${CONTAINER_NAME}" \
  -e POSTGRES_USER="${DB_USER}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -e POSTGRES_DB="${DB_NAME}" \
  -p 127.0.0.1::5432 \
  -d "${POSTGRES_IMAGE}" >/dev/null

PORT=""
for _ in $(seq 1 60); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" >/dev/null 2>&1; then
    PORT="$(docker port "${CONTAINER_NAME}" 5432/tcp | sed 's/.*://')"
    break
  fi
  sleep 1
done

if [[ -z "${PORT}" ]]; then
  docker logs "${CONTAINER_NAME}" >&2 || true
  fail "PostgreSQL did not become ready"
fi

DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}"

log "Running alembic upgrade head against isolated database"
(
  cd "${BACKEND_DIR}"
  DATABASE_URL="${DATABASE_URL}" "${PYTHON_BIN}" -m alembic upgrade head
)

log "Verifying required schema objects"
check_sql="
select
  exists (select 1 from information_schema.tables where table_name = 'organizations') as organizations,
  exists (select 1 from information_schema.tables where table_name = 'users') as users,
  exists (select 1 from information_schema.tables where table_name = 'assets') as assets,
  exists (select 1 from information_schema.tables where table_name = 'field_measurements') as field_measurements,
  exists (select 1 from information_schema.tables where table_name = 'wireless_links') as wireless_links,
  exists (select 1 from information_schema.tables where table_name = 'radio_devices') as radio_devices,
  exists (select 1 from information_schema.tables where table_name = 'credential_profiles') as credential_profiles,
  exists (select 1 from information_schema.tables where table_name = 'edge_agents') as edge_agents,
  exists (select 1 from information_schema.tables where table_name = 'activity_events') as activity_events,
  exists (select 1 from information_schema.columns where table_name = 'assets' and column_name = 'last_seen') as assets_last_seen,
  exists (select 1 from information_schema.columns where table_name = 'assets' and column_name = 'last_poll_status') as assets_last_poll_status,
  exists (select 1 from information_schema.columns where table_name = 'field_measurements' and column_name = 'wireless_link_id') as field_measurements_wireless_link_id,
  (select version_num from alembic_version) as revision;
"

result="$(docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "${check_sql}")"
log "Schema check result: ${result}"

IFS='|' read -r organizations users assets field_measurements wireless_links radio_devices credential_profiles edge_agents activity_events assets_last_seen assets_last_poll_status field_measurements_wireless_link_id revision <<< "${result}"

for value in "${organizations}" "${users}" "${assets}" "${field_measurements}" "${wireless_links}" "${radio_devices}" "${credential_profiles}" "${edge_agents}" "${activity_events}" "${assets_last_seen}" "${assets_last_poll_status}" "${field_measurements_wireless_link_id}"; do
  [[ "${value}" == "t" ]] || fail "Required table/column check failed: ${result}"
done

[[ "${revision}" == "20260507_0009" ]] || fail "Expected alembic head 20260507_0009, got ${revision}"

log "PASS: clean alembic upgrade head produced the expected public-alpha schema"
