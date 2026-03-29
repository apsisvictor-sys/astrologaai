type EnvCheck = {
  key: string;
  level: 'critical' | 'warn' | 'optional';
  present: boolean;
  degradedFeature?: string;
};

// CRITICAL: App crashes if missing
const CRITICAL_KEYS = ['DATABASE_URL', 'JWT_SECRET', 'CRON_SECRET'] as const;

// CRITICAL (conditional): At least one LLM key must be present
const LLM_KEYS = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'] as const;

// WARN: App runs but feature is degraded — logged at startup
const WARN_KEYS: Array<{ key: string; feature: string }> = [
  { key: 'RESEND_API_KEY', feature: 'email (lifecycle, verification, password reset)' },
  { key: 'STRIPE_SECRET_KEY', feature: 'payments (subscriptions, checkout)' },
  { key: 'STRIPE_WEBHOOK_SECRET', feature: 'Stripe webhook verification' },
  { key: 'ASTROLOGY_API_KEY', feature: 'birth chart calculation (astrology-api.io)' },
  { key: 'REDIS_URL', feature: 'session caching, rate limits, chat context persistence' },
];

// OPTIONAL: No warning needed
const OPTIONAL_KEYS = [
  'FRONTEND_URL',
  'FRONTEND_URLS',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

function hasValue(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export function getEnvValidationReport() {
  const checks: EnvCheck[] = [
    ...CRITICAL_KEYS.map((key) => ({
      key,
      level: 'critical' as const,
      present: hasValue(process.env[key]),
    })),
    ...WARN_KEYS.map(({ key, feature }) => ({
      key,
      level: 'warn' as const,
      present: hasValue(process.env[key]),
      degradedFeature: feature,
    })),
    ...OPTIONAL_KEYS.map((key) => ({
      key,
      level: 'optional' as const,
      present: hasValue(process.env[key]),
    })),
  ];

  const missingCritical = checks
    .filter((c) => c.level === 'critical' && !c.present)
    .map((c) => c.key);

  // At least one LLM key must be present
  const hasLlmKey = LLM_KEYS.some((key) => hasValue(process.env[key]));
  if (!hasLlmKey) {
    missingCritical.push('ANTHROPIC_API_KEY or OPENAI_API_KEY (at least one required)');
  }

  const degradedFeatures = checks
    .filter((c) => c.level === 'warn' && !c.present)
    .map((c) => ({ key: c.key, feature: c.degradedFeature! }));

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    checkedAt: new Date().toISOString(),
    checks,
    ok: missingCritical.length === 0,
    missingCritical,
    degradedFeatures,
    hasLlmKey,
  };
}
