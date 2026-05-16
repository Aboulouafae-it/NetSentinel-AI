#!/usr/bin/env bash
set -euo pipefail

URL="${NETSENTINEL_URL:-http://localhost:3000/setup}"
HEALTH_URL="${NETSENTINEL_HEALTH_URL:-http://localhost:8000/health}"

open_url() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$1" >/dev/null 2>&1 &
  elif command -v sensible-browser >/dev/null 2>&1; then
    sensible-browser "$1" >/dev/null 2>&1 &
  else
    echo "Open ${1} in your browser."
  fi
}

if command -v curl >/dev/null 2>&1; then
  if ! curl -fsS --max-time 3 "${HEALTH_URL}" >/dev/null; then
    if command -v notify-send >/dev/null 2>&1; then
      notify-send "NetSentinel AI Console" "Backend health check failed. Try: sudo systemctl status netsentinel-compose.service"
    else
      echo "NetSentinel AI OS backend health check failed. Try: sudo systemctl status netsentinel-compose.service" >&2
    fi
  fi
fi

open_url "${URL}"
