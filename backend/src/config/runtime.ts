const DEFAULT_DEV_FRONTEND = 'http://localhost:3000';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function splitOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function buildAllowedOrigins(): string[] {
  const configured = splitOrigins(process.env.FRONTEND_URLS);

  if (process.env.FRONTEND_URL) {
    configured.push(...splitOrigins(process.env.FRONTEND_URL));
  }

  if (process.env.NODE_ENV !== 'production') {
    configured.push(DEFAULT_DEV_FRONTEND);
  }

  return Array.from(new Set(configured));
}

export const runtimeConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  allowedOrigins: buildAllowedOrigins(),
};

export function isOriginAllowed(origin?: string): boolean {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);

  if (runtimeConfig.allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalizedOrigin)) {
    return true;
  }

  return false;
}
