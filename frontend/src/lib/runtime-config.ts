const PROD_API_FALLBACK = 'https://astrologaai-backend-production.up.railway.app';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (configured) {
    return normalizeUrl(configured);
  }

  if (isProd) {
    return PROD_API_FALLBACK;
  }

  return 'http://localhost:4000';
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
    ? 'https://frontend-rust-nu-20.vercel.app'
    : 'http://localhost:3000';
}
