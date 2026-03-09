const PROD_API_FALLBACK = 'https://astrologaai-backend-production.up.railway.app';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return normalizeUrl(configured);
  }

  if (typeof window !== 'undefined') {
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return isLocalHost ? 'http://localhost:4000' : PROD_API_FALLBACK;
  }

  return process.env.NODE_ENV === 'production' ? PROD_API_FALLBACK : 'http://localhost:4000';
}

export function getFrontendBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();

  if (configured) {
    return normalizeUrl(configured);
  }

  if (typeof window !== 'undefined') {
    return normalizeUrl(window.location.origin);
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://astrologa.bg'
    : 'http://localhost:3000';
}
