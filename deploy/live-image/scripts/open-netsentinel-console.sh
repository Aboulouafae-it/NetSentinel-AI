#!/usr/bin/env bash
set -euo pipefail

APP_NAME="NetSentinel AI Console"
BASE_URL="${NETSENTINEL_APP_URL:-http://localhost:3000}"
SETUP_URL="${NETSENTINEL_SETUP_URL:-${BASE_URL}/setup}"
BACKEND_HEALTH_URL="${NETSENTINEL_BACKEND_HEALTH_URL:-http://localhost:8000/health}"
REQUESTED_PATH="${1:-}"

if [[ -n "${REQUESTED_PATH}" && "${REQUESTED_PATH}" != /* ]]; then
  REQUESTED_PATH="/${REQUESTED_PATH}"
fi

message() {
  printf '%s\n' "$*"
}

has_display() {
  [[ -n "${DISPLAY:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]]
}

url_ready() {
  command -v curl >/dev/null 2>&1 || return 1
  curl -fsS --max-time 2 "$1" >/dev/null 2>&1
}

terminal_cmd() {
  if command -v xfce4-terminal >/dev/null 2>&1; then
    printf '%s\n' "xfce4-terminal"
  elif command -v x-terminal-emulator >/dev/null 2>&1; then
    printf '%s\n' "x-terminal-emulator"
  elif command -v xterm >/dev/null 2>&1; then
    printf '%s\n' "xterm"
  else
    return 1
  fi
}

show_not_ready() {
  local text="NetSentinel services are not running yet.

Run appliance-status or start the appliance stack.

Console URL: ${BASE_URL}
Setup URL:   ${SETUP_URL}
Backend:     ${BACKEND_HEALTH_URL}"

  if has_display && command -v zenity >/dev/null 2>&1; then
    zenity --warning --title "${APP_NAME}" --text "${text}" 2>/dev/null || true
    return
  fi

  if has_display; then
    local terminal
    terminal="$(terminal_cmd 2>/dev/null)" || {
      message "${text}"
      return
    }
    "${terminal}" --title="${APP_NAME}" --command="bash -lc 'cat <<MSG
${text}
MSG
printf \"\\nPress Enter to close...\"; read -r _'" >/dev/null 2>&1 || message "${text}"
    return
  fi

  message "${text}"
}

open_browser() {
  local url="$1"

  if command -v chromium >/dev/null 2>&1; then
    chromium --no-first-run --disable-default-apps --app="${url}" >/dev/null 2>&1 &
    return 0
  fi

  if command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --no-first-run --disable-default-apps --app="${url}" >/dev/null 2>&1 &
    return 0
  fi

  if command -v firefox-esr >/dev/null 2>&1; then
    firefox-esr "${url}" >/dev/null 2>&1 &
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1 &
    return 0
  fi

  return 1
}

main() {
  local target_url="${SETUP_URL}"
  if [[ -n "${REQUESTED_PATH}" ]]; then
    target_url="${BASE_URL}${REQUESTED_PATH}"
  elif url_ready "${BASE_URL}"; then
    target_url="${BASE_URL}"
  fi

  if ! url_ready "${BASE_URL}" && ! url_ready "${SETUP_URL}"; then
    show_not_ready
    return 1
  fi

  if ! open_browser "${target_url}"; then
    message "No graphical browser is available. Open: ${target_url}"
    return 1
  fi
}

main "$@"
