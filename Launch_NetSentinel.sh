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
    docker compose up -d >> "$LOG_FILE" 2>&1
    return $?
  fi

  if command -v pkexec >/dev/null 2>&1; then
    pkexec docker compose --project-directory "$SCRIPT_DIR" up -d >> "$LOG_FILE" 2>&1
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

ensure_shared_memory() {
  local mode
  mode="$(stat -c '%a' /dev/shm 2>/dev/null || true)"

  if [ "$mode" = "1777" ]; then
    return 0
  fi

  log "Fixing /dev/shm permissions for Electron renderer. Current mode: ${mode:-unknown}"

  if chmod 1777 /dev/shm >/dev/null 2>&1; then
    return 0
  fi

  if command -v pkexec >/dev/null 2>&1; then
    pkexec chmod 1777 /dev/shm >> "$LOG_FILE" 2>&1 || true
  fi
}

launch_desktop() {
  cd "$DESKTOP_DIR" || exit 1

  ensure_shared_memory

  export ELECTRON_DISABLE_GPU=1
  export ELECTRON_OZONE_PLATFORM_HINT=x11
  export LIBGL_ALWAYS_SOFTWARE=1
  unset ELECTRON_RUN_AS_NODE

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

log "Docker services requested. Launching desktop client."
wait_for_url "http://127.0.0.1:3000" 8 || log "Frontend is not ready yet; Electron will keep retrying."

launch_desktop
