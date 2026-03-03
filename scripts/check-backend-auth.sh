#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
PORT="${CHECK_PORT:-4010}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/astrologaai-backend-check.log"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill -- "-${SERVER_PID}" 2>/dev/null || true
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

pushd "$BACKEND_DIR" >/dev/null
JWT_SECRET="${JWT_SECRET:-dev-check-secret-please-change-1234567890}"
CRON_SECRET="${CRON_SECRET:-dev-cron-secret-please-change-1234567890}"
FRONTEND_URLS="${FRONTEND_URLS:-http://localhost:3000,https://frontend-rust-nu-20.vercel.app}"
setsid env NODE_ENV=development PORT="$PORT" JWT_SECRET="$JWT_SECRET" CRON_SECRET="$CRON_SECRET" FRONTEND_URLS="$FRONTEND_URLS" npm run dev >"$LOG_FILE" 2>&1 &
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
  local forwarded_ip="10.$((RANDOM % 256)).$((RANDOM % 256)).$((RANDOM % 256))"
  curl -s -o /tmp/auth-check-response.json -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -H "X-Forwarded-For: ${forwarded_ip}" \
    -X POST \
    "$BASE_URL/api/v1/auth/$endpoint" \
    -d "$payload"
}

RANDOM_EMAIL="smoke.check.$(date +%s)@example.com"

LOGIN_STATUS="$(auth_status login '{"email":"","password":""}')"
REGISTER_STATUS="$(auth_status register '{"email":"bad","password":"short"}')"
VALID_SHAPE_LOGIN_STATUS="$(auth_status login '{"email":"smoke-check@example.com","password":"ValidPass1"}')"
VALID_SHAPE_REGISTER_STATUS="$(auth_status register "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"ValidPass1\",\"fullName\":\"Smoke CI\"}")"

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

if [[ "$VALID_SHAPE_LOGIN_STATUS" == "500" ]]; then
  echo "Expected valid-shape login payload to avoid HTTP 500"
  cat /tmp/auth-check-response.json
  exit 1
fi

if [[ "$VALID_SHAPE_REGISTER_STATUS" == "500" ]]; then
  echo "Expected valid-shape register payload to avoid HTTP 500"
  cat /tmp/auth-check-response.json
  exit 1
fi

echo "✅ Backend health and auth validation checks passed (no auth 500s for malformed/valid-shape payloads)"
