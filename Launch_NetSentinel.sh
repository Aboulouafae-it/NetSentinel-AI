#!/usr/bin/env bash
set -u

APP_NAME="NetSentinel AI"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$SCRIPT_DIR/desktop-client"
LOG_FILE="${XDG_STATE_HOME:-$HOME/.local/state}/netsentinel-ai/launcher.log"

mkdir -p "$(dirname "$LOG_FILE")"
cd "$SCRIPT_DIR" || exit 1

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"
}

notify() {
  if command -v notify-send >/dev/null 2>&1; then
    notify-send "$APP_NAME" "$1" >/dev/null 2>&1 || true
  fi
}

start_platform() {
  log "Starting Docker services"

  if docker compose ps >/dev/null 2>&1; then
    docker compose up -d --build >> "$LOG_FILE" 2>&1
    return $?
  fi

  if command -v pkexec >/dev/null 2>&1; then
    pkexec docker compose --project-directory "$SCRIPT_DIR" up -d --build >> "$LOG_FILE" 2>&1
    return $?
  fi

  log "Docker is not accessible and pkexec is not installed"
  return 1
}

wait_for_url() {
  local url="$1"
  local max_wait="$2"
  local waited=0

  while [ "$waited" -lt "$max_wait" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    waited=$((waited + 2))
  done

  return 1
}

launch_desktop() {
  cd "$DESKTOP_DIR" || exit 1

  if [ ! -d node_modules ]; then
    log "Installing desktop dependencies"
    npm install >> "$LOG_FILE" 2>&1 || return 1
  fi

  log "Launching Electron desktop client"
  exec npm start >> "$LOG_FILE" 2>&1
}

notify "Starting local platform services..."

if ! start_platform; then
  notify "Could not start Docker services. See $LOG_FILE"
  exit 1
fi

wait_for_url "http://127.0.0.1:8000/health" 90 || log "Backend health check timed out"
wait_for_url "http://127.0.0.1:3000" 90 || log "Frontend check timed out"

launch_desktop
