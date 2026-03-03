#!/usr/bin/env node

const API_BASE_URL = process.env.API_BASE_URL || 'https://astrologaai-backend-production.up.railway.app';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://frontend-rust-nu-20.vercel.app';

const loginPayload = { email: 'smoke-test@example.com', password: 'invalid-password' };

async function main() {
  console.log(`[smoke] API: ${API_BASE_URL}`);
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      Origin: FRONTEND_ORIGIN,
    },
    body: JSON.stringify(loginPayload),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text fallback
  }

  if (res.status >= 500) {
    console.error('[FAIL] login endpoint returned 5xx');
    console.error(text);
    process.exit(1);
  }

  if (!data || typeof data !== 'object') {
    console.error('[FAIL] login endpoint did not return JSON');
    console.error(text);
    process.exit(1);
  }

  console.log(`[ok] login responded HTTP ${res.status}`);
  console.log('[PASS] Auth smoke passed');
}

main().catch((error) => {
  console.error('[FAIL] smoke script crashed');
  console.error(error);
  process.exit(1);
});
