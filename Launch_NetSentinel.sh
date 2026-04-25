#!/bin/bash
# ═══════════════════════════════════════════════════
#  NetSentinel AI — Desktop Launcher v1.0
# ═══════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "═══════════════════════════════════════════════════"
echo "  NetSentinel AI — Starting Platform..."
echo "═══════════════════════════════════════════════════"

# Step 1: Start backend services via Docker
echo "[1/3] Starting backend services (Docker)..."
sudo docker compose up -d --build 2>&1 | tail -5

# Step 2: Wait for backend to be ready
echo "[2/3] Waiting for backend API..."
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✓ Backend ready (${WAITED}s)"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo "  ... waiting (${WAITED}s)"
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "  ⚠ Backend may still be starting. Proceeding anyway."
fi

# Step 3: Launch desktop client
echo "[3/3] Launching desktop window..."
cd "$SCRIPT_DIR/desktop-client"

if [ ! -d "node_modules" ]; then
  echo "  Installing desktop client dependencies..."
  npm install --silent
fi

npm start
