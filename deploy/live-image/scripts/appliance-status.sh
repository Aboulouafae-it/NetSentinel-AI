#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${NETSENTINEL_INSTALL_DIR:-/opt/netsentinel}"
ENV_FILE="${APP_ROOT}/.env.production"
COMPOSE_FILE="${APP_ROOT}/docker-compose.prod.yml"
EXIT_CODE=0

echo "NetSentinel AI Appliance Status"
echo "================================"
echo "App root: ${APP_ROOT}"

if [[ -f "${ENV_FILE}" ]]; then
  echo "Environment: present"
else
  echo "Environment: missing (${ENV_FILE})"
  EXIT_CODE=1
fi

if command -v docker >/dev/null 2>&1; then
  echo "Docker: $(docker --version)"
else
  echo "Docker: missing"
  EXIT_CODE=1
fi

if [[ -f "${COMPOSE_FILE}" ]] && [[ -f "${ENV_FILE}" ]] && command -v docker >/dev/null 2>&1; then
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps || true
  for service in postgres redis backend frontend; do
    if docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps --status running "${service}" >/dev/null 2>&1; then
      echo "Container ${service}: checked"
    else
      echo "Container ${service}: unavailable"
      EXIT_CODE=1
    fi
  done
else
  echo "Compose stack: not ready"
  EXIT_CODE=1
fi

if command -v curl >/dev/null 2>&1; then
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then
    echo "Backend health: ok"
  else
    echo "Backend health: unavailable"
    EXIT_CODE=1
  fi
  if curl -fsS http://localhost:3000 >/dev/null 2>&1; then
    echo "Frontend: reachable"
  else
    echo "Frontend: unavailable"
    EXIT_CODE=1
  fi
fi

echo
echo "Disk usage:"
df -h / /opt /var 2>/dev/null || df -h /

echo
echo "Setup URL: http://localhost:3000/setup"
echo "Dashboard URL: http://localhost:3000/"

exit "${EXIT_CODE}"
