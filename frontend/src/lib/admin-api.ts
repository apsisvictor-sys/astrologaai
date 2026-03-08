/**
 * Admin API helpers
 * Step 11: Admin Dashboard
 */

import { getApiBaseUrl } from './runtime-config';

const API_URL = getApiBaseUrl();
const TOKEN_KEY = 'astrologaai_access_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function adminFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${API_URL}/api/v1/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await adminFetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function adminPut<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

// Check if current user is admin (fast: tries overview endpoint)
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const res = await adminFetch('/overview');
    return res.ok;
  } catch {
    return false;
  }
}
