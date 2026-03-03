#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${CHECK_PORT:-4010}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/astrologaai-backend-check.log"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pushd "$BACKEND_DIR" >/dev/null
JWT_SECRET="${JWT_SECRET:-dev-check-secret-please-change-1234567890}"
CRON_SECRET="${CRON_SECRET:-dev-cron-secret-please-change-1234567890}"
FRONTEND_URLS="${FRONTEND_URLS:-http://localhost:3000,https://frontend-rust-nu-20.vercel.app}"
NODE_ENV=development PORT="$PORT" JWT_SECRET="$JWT_SECRET" CRON_SECRET="$CRON_SECRET" FRONTEND_URLS="$FRONTEND_URLS" npm run dev >"$LOG_FILE" 2>&1 &
SERVER_PID=$!
popd >/dev/null

for _ in {1..30}; do
  if curl -sSf "$BASE_URL/health" >/dev/null; then
    break
  fi
  sleep 1
done

curl -sSf "$BASE_URL/health" >/dev/null

auth_status() {
  local endpoint="$1"
  local payload="$2"
  curl -s -o /tmp/auth-check-response.json -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -X POST \
    "$BASE_URL/api/v1/auth/$endpoint" \
    -d "$payload"
}

LOGIN_STATUS="$(auth_status login '{"email":"","password":""}')"
REGISTER_STATUS="$(auth_status register '{"email":"bad","password":"short"}')"

if [[ "$LOGIN_STATUS" != "400" ]]; then
  echo "Expected login validation status 400, got $LOGIN_STATUS"
  cat /tmp/auth-check-response.json
  exit 1
fi

if [[ "$REGISTER_STATUS" != "400" ]]; then
  echo "Expected register validation status 400, got $REGISTER_STATUS"
  cat /tmp/auth-check-response.json
  exit 1
fi

echo "✅ Backend health and auth validation checks passed"
