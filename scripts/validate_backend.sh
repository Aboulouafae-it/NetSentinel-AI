#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="${NETSENTINEL_BACKEND_VENV:-${ROOT_DIR}/.tmp/backend-venv}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

log() {
  printf '[backend-validation] %s\n' "$*"
}

if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  log "Python interpreter not found: ${PYTHON_BIN}"
  exit 1
fi

log "Repository: ${ROOT_DIR}"
log "Virtual environment: ${VENV_DIR}"

if [ ! -x "${VENV_DIR}/bin/python" ]; then
  log "Creating backend validation virtual environment"
  "${PYTHON_BIN}" -m venv "${VENV_DIR}"
fi

PIP_DISABLE_PIP_VERSION_CHECK=1 "${VENV_DIR}/bin/python" -m pip install --upgrade pip
PIP_DISABLE_PIP_VERSION_CHECK=1 "${VENV_DIR}/bin/python" -m pip install -r "${ROOT_DIR}/backend/requirements.txt"

log "Running backend import check"
(
  cd "${ROOT_DIR}/backend"
  "${VENV_DIR}/bin/python" -c "import app.main"
)

log "Running backend test suite"
(
  cd "${ROOT_DIR}"
  PYTHONPATH="${ROOT_DIR}/backend${PYTHONPATH:+:${PYTHONPATH}}" "${VENV_DIR}/bin/python" -m pytest backend/tests -q
)

log "Backend validation passed"
