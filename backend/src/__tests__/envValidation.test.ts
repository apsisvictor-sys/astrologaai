import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('getEnvValidationReport', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  async function getReport() {
    // Re-import to pick up fresh env
    const mod = await import('../config/envValidation');
    return mod.getEnvValidationReport();
  }

  it('passes when all critical keys + at least one LLM key present', async () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'secret';
    process.env.CRON_SECRET = 'cron';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    const report = await getReport();
    expect(report.ok).toBe(true);
    expect(report.missingCritical).toHaveLength(0);
  });

  it('fails when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'secret';
    process.env.CRON_SECRET = 'cron';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    const report = await getReport();
    expect(report.ok).toBe(false);
    expect(report.missingCritical).toContain('DATABASE_URL');
  });

  it('fails when no LLM key is present', async () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'secret';
    process.env.CRON_SECRET = 'cron';
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const report = await getReport();
    expect(report.ok).toBe(false);
    expect(report.missingCritical.some(k => k.includes('ANTHROPIC_API_KEY or OPENAI_API_KEY'))).toBe(true);
  });

  it('passes with only OPENAI_API_KEY (no Anthropic)', async () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'secret';
    process.env.CRON_SECRET = 'cron';
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';

    const report = await getReport();
    expect(report.ok).toBe(true);
    expect(report.hasLlmKey).toBe(true);
  });

  it('reports degraded features for missing WARN keys', async () => {
    process.env.DATABASE_URL = 'postgresql://test';
    process.env.JWT_SECRET = 'secret';
    process.env.CRON_SECRET = 'cron';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    delete process.env.RESEND_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const report = await getReport();
    expect(report.ok).toBe(true); // Still OK — these are warnings
    expect(report.degradedFeatures.length).toBeGreaterThan(0);
    expect(report.degradedFeatures.some(d => d.key === 'RESEND_API_KEY')).toBe(true);
  });
});
