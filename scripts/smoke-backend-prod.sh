#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://astrologaai-backend-production.up.railway.app}"
FRONTEND_ORIGIN="${FRONTEND_ORIGIN:-https://frontend-rust-nu-20.vercel.app}"
ALT_FRONTEND_ORIGIN="${ALT_FRONTEND_ORIGIN:-https://astrologaai-qa.vercel.app}"
BLOCKED_ORIGIN="${BLOCKED_ORIGIN:-https://blocked-origin.example}"

echo "[smoke] API: $API_BASE_URL"
echo "[smoke] Origin: $FRONTEND_ORIGIN"

health_status=$(curl -sS -o /tmp/astrologaai-health.json -w "%{http_code}" "$API_BASE_URL/health")
if [[ "$health_status" != "200" ]]; then
  echo "[FAIL] /health returned HTTP $health_status"
  cat /tmp/astrologaai-health.json
  exit 1
fi

echo "[ok] /health"

cors_headers=$(curl -sSI -X OPTIONS "$API_BASE_URL/api/v1/auth/login" \
  -H "Origin: $FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,accept-language")

if ! echo "$cors_headers" | grep -qi "access-control-allow-origin: $FRONTEND_ORIGIN"; then
  echo "[FAIL] CORS allow-origin header missing/mismatched"
  echo "$cors_headers"
  exit 1
fi

echo "[ok] CORS preflight for auth/login"

alt_headers=$(curl -sSI -X OPTIONS "$API_BASE_URL/api/v1/auth/login" \
  -H "Origin: $ALT_FRONTEND_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,accept-language")

if ! echo "$alt_headers" | grep -qi "access-control-allow-origin: $ALT_FRONTEND_ORIGIN"; then
  echo "[FAIL] CORS allow-origin missing for alternate origin"
  echo "$alt_headers"
  exit 1
fi

echo "[ok] CORS preflight for alternate origin"

blocked_headers=$(curl -sSI -X OPTIONS "$API_BASE_URL/api/v1/auth/login" \
  -H "Origin: $BLOCKED_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type")

if echo "$blocked_headers" | grep -qi "access-control-allow-origin:"; then
  echo "[FAIL] blocked origin unexpectedly received CORS allow-origin"
  echo "$blocked_headers"
  exit 1
fi

echo "[ok] blocked origin rejected"

echo "[PASS] Backend production smoke passed"
