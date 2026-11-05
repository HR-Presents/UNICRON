#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

find_free_port() {
  python3 - <<'PY'
import socket
with socket.socket() as s:
    s.bind(("127.0.0.1", 0))
    print(s.getsockname()[1])
PY
}

BACKEND_PORT=$(find_free_port)
FRONTEND_PORT=$(find_free_port)

while [ "$FRONTEND_PORT" = "$BACKEND_PORT" ]; do
  FRONTEND_PORT=$(find_free_port)
done

if [ ! -x "$ROOT/.venv/bin/python" ]; then
  echo "Python virtual environment missing."
  exit 1
fi

if [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo "Frontend dependencies missing."
  exit 1
fi

printf 'NEXT_PUBLIC_API_URL=http://localhost:%s\n' "$BACKEND_PORT" > "$ROOT/frontend/.env.local"

cleanup() {
  echo ""
  echo "Stopping CIVITAS..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Starting CIVITAS backend on port $BACKEND_PORT"

(
  cd "$ROOT/backend"
  "$ROOT/.venv/bin/python" -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Starting CIVITAS frontend on port $FRONTEND_PORT"

(
  cd "$ROOT/frontend"
  npm run dev -- --hostname 127.0.0.1 --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo "       CIVITAS DEVELOPMENT SERVER"
echo "======================================"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "API Docs: http://localhost:$BACKEND_PORT/docs"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop both servers."

wait -n "$BACKEND_PID" "$FRONTEND_PID"
