/**
 * Integration tests for GET /api/v1/transits/commentary
 * PIX-145 QA smoke test — transit commentary endpoint (PIX-139)
 */
import request from 'supertest';
import express from 'express';

// --- Module mocks (must come before imports that load the mocked modules) ---

vi.mock('../../src/utils/jwt', () => ({
  JWT_SECRET: 'test-secret',
  JWT_CONFIG: { expiresIn: '15m', refreshExpiresIn: '7d' },
  getJWTSecret: () => 'test-secret',
}));

vi.mock('jsonwebtoken', () => {
  const mod = {
    verify: vi.fn(),
    sign: vi.fn(),
    TokenExpiredError: class TokenExpiredError extends Error {},
    JsonWebTokenError: class JsonWebTokenError extends Error {},
  };
  return { default: mod, ...mod };
});

vi.mock('../../src/utils/prisma', () => {
  const mock = {
    user: { findUnique: vi.fn() },
    birthChart: { findFirst: vi.fn() },
  };
  return { default: mock, prisma: mock, ...mock };
});

vi.mock('../../src/utils/redis', () => {
  const mock = {
    get: vi.fn(),
    setEx: vi.fn(),
  };
  return { default: mock, redisClient: mock };
});

vi.mock('../../src/services/transits', () => ({
  getActiveTransitsForUser: vi.fn(),
}));

vi.mock('../../src/services/llm', () => ({
  getModelIdForTier: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-anthropic-model'),
}));

vi.mock('../../src/config/astrological-events', () => ({
  getCurrentEvents: vi.fn(() => []),
}));

// Controllable auth mock — set _currentUser before each test
let _currentUser: any = null;
vi.mock('../../src/middleware/auth', () => ({
  authMiddleware: vi.fn(async (req: any, res: any, next: any) => {
    if (!_currentUser) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    req.user = _currentUser;
    next();
  }),
}));

// --- Imports after mocks ---
import { prisma } from '../../src/utils/prisma';
import { redisClient } from '../../src/utils/redis';
import { getActiveTransitsForUser } from '../../src/services/transits';
import { getModelIdForTier } from '../../src/services/llm';
import { generateText } from 'ai';
import transitsRouter from '../../src/routes/transits';

// --- Fixtures ---

const MOCK_USER_FREE = { id: 'user-free-id', email: 'free@test.com', tier: 'FREE', language: 'bg' };
const MOCK_USER_PRO  = { id: 'user-pro-id',  email: 'pro@test.com',  tier: 'PRO',  language: 'bg' };
const MOCK_USER_PREMIUM = { id: 'user-premium-id', email: 'premium@test.com', tier: 'PREMIUM', language: 'bg' };
const MOCK_USER_EN   = { id: 'user-en-id',   email: 'en@test.com',   tier: 'PRO',  language: 'en' };

const MOCK_CHART_DATA = { planets: { sun: { longitude: 15 }, moon: { longitude: 120 } } };
const MOCK_BIRTH_CHART = { id: 'chart-1', userId: 'user-free-id', chartData: MOCK_CHART_DATA, createdAt: new Date() };

const MOCK_ASPECTS = [
  { transitPlanet: 'pluto',   transitPlanetBg: 'Плутон',  natalPlanet: 'sun',  natalPlanetBg: 'Слънце', aspect: 'trine',       aspectBg: 'трин',      orb: 1.2, influence: 'positive',    description: 'deep' },
  { transitPlanet: 'neptune', transitPlanetBg: 'Нептун',  natalPlanet: 'moon', natalPlanetBg: 'Луна',   aspect: 'square',      aspectBg: 'квадрат',   orb: 3.5, influence: 'challenging', description: 'dreamy' },
  { transitPlanet: 'saturn',  transitPlanetBg: 'Сатурн',  natalPlanet: 'sun',  natalPlanetBg: 'Слънце', aspect: 'opposition',  aspectBg: 'опозиция',  orb: 4.1, influence: 'challenging', description: 'limit' },
  { transitPlanet: 'jupiter', transitPlanetBg: 'Юпитер',  natalPlanet: 'moon', natalPlanetBg: 'Луна',   aspect: 'trine',       aspectBg: 'трин',      orb: 1.8, influence: 'positive',    description: 'expand' },
  { transitPlanet: 'mars',    transitPlanetBg: 'Марс',    natalPlanet: 'sun',  natalPlanetBg: 'Слънце', aspect: 'conjunction', aspectBg: 'конюнкция', orb: 0.8, influence: 'neutral',     description: 'active' },
  { transitPlanet: 'venus',   transitPlanetBg: 'Венера',  natalPlanet: 'moon', natalPlanetBg: 'Луна',   aspect: 'sextile',     aspectBg: 'секстил',   orb: 2.0, influence: 'positive',    description: 'harmony' },
];

const MOCK_LLM_RESPONSE_BG = JSON.stringify({
  headline: 'Силен ден за духовна интроспекция',
  body: 'Плутон трин Слънце носи дълбока трансформация.',
  significantAspects: ['Плутон трин Слънце (орб 1.2°)', 'Нептун квадрат Луна (орб 3.5°)'],
});
const MOCK_LLM_RESPONSE_EN = JSON.stringify({
  headline: 'A day of deep transformation',
  body: 'Pluto trine Sun brings profound change.',
  significantAspects: ['Pluto trine Sun (orb 1.2°)'],
});

// --- Single test app (auth controlled via _currentUser) ---
const app = express();
app.use(express.json());
app.use('/api/v1/transits', transitsRouter);

// Helper to get generateText call args
const getLLMCall = () => (generateText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];

// =====================================================================

describe('GET /api/v1/transits/commentary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _currentUser = null;
    (redisClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (redisClient.setEx as ReturnType<typeof vi.fn>).mockResolvedValue('OK');
    (getActiveTransitsForUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      aspectsToNatal: MOCK_ASPECTS,
      skyPositions: {},
      moonPhase: 'waxing_gibbous',
    });
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({ text: MOCK_LLM_RESPONSE_BG });
    (getModelIdForTier as ReturnType<typeof vi.fn>).mockReturnValue('claude-haiku-4-5-20251001');
  });

  // ------------------------------------------------------------------
  // TC1 — Auth
  // ------------------------------------------------------------------
  describe('TC1 — Authentication', () => {
    it('returns 401 when no auth token provided', async () => {
      _currentUser = null;
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // ------------------------------------------------------------------
  // TC2 — No birth data
  // ------------------------------------------------------------------
  describe('TC2 — No birth data', () => {
    beforeEach(() => { _currentUser = MOCK_USER_FREE; });

    it('returns 400 CHART_NOT_FOUND when user has no natal chart', async () => {
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CHART_NOT_FOUND');
    });

    it('returns 400 CHART_NOT_FOUND when chartData is null', async () => {
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'c1', chartData: null });
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CHART_NOT_FOUND');
    });
  });

  // ------------------------------------------------------------------
  // TC3 — FREE tier
  // ------------------------------------------------------------------
  describe('TC3 — FREE tier response', () => {
    beforeEach(() => {
      _currentUser = MOCK_USER_FREE;
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      (getModelIdForTier as ReturnType<typeof vi.fn>).mockReturnValue('claude-haiku-4-5-20251001');
    });

    it('returns 200 with correct response shape', async () => {
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        headline: expect.any(String),
        body: expect.any(String),
        significantAspects: expect.any(Array),
        generatedAt: expect.any(String),
      });
    });

    it('headline and body are non-empty strings', async () => {
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.body.data.headline.length).toBeGreaterThan(0);
      expect(res.body.data.body.length).toBeGreaterThan(0);
    });

    it('uses top 3 aspects in LLM prompt for FREE tier', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      expect(call).toBeDefined();
      const userPrompt = call.messages[1].content as string;
      const aspectLines = userPrompt.split('\n').filter((l: string) => l.includes('orb') && l.includes('°'));
      expect(aspectLines.length).toBeLessThanOrEqual(3);
    });

    it('calls getModelIdForTier with FREE', async () => {
      await request(app).get('/api/v1/transits/commentary');
      expect(getModelIdForTier).toHaveBeenCalledWith('FREE');
    });
  });

  // ------------------------------------------------------------------
  // TC4 — PRO tier
  // ------------------------------------------------------------------
  describe('TC4 — PRO tier', () => {
    beforeEach(() => {
      _currentUser = MOCK_USER_PRO;
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      (getModelIdForTier as ReturnType<typeof vi.fn>).mockReturnValue('claude-sonnet-4-6');
    });

    it('returns 200 with full commentary', async () => {
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(res.body.data.body).toBeTruthy();
    });

    it('calls getModelIdForTier with PRO', async () => {
      await request(app).get('/api/v1/transits/commentary');
      expect(getModelIdForTier).toHaveBeenCalledWith('PRO');
    });

    it('uses top 5 aspects in LLM prompt for PRO tier', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      const userPrompt = call.messages[1].content as string;
      const aspectLines = userPrompt.split('\n').filter((l: string) => l.includes('orb') && l.includes('°'));
      expect(aspectLines.length).toBeLessThanOrEqual(5);
    });

    it('PRO prompt instructs 2 paragraphs (BG)', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      const userPrompt = call.messages[1].content as string;
      expect(userPrompt).toContain('2 параграфа');
    });
  });

  // ------------------------------------------------------------------
  // TC5 — PREMIUM tier
  // ------------------------------------------------------------------
  describe('TC5 — PREMIUM tier', () => {
    beforeEach(() => {
      _currentUser = MOCK_USER_PREMIUM;
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      (getModelIdForTier as ReturnType<typeof vi.fn>).mockReturnValue('claude-opus-4-6');
    });

    it('returns 200 with deep commentary', async () => {
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(res.body.data.significantAspects).toBeInstanceOf(Array);
    });

    it('calls getModelIdForTier with PREMIUM', async () => {
      await request(app).get('/api/v1/transits/commentary');
      expect(getModelIdForTier).toHaveBeenCalledWith('PREMIUM');
    });

    it('sends ALL aspects (no slice) in prompt for PREMIUM', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      const userPrompt = call.messages[1].content as string;
      const aspectLines = userPrompt.split('\n').filter((l: string) => l.includes('orb') && l.includes('°'));
      expect(aspectLines.length).toBe(MOCK_ASPECTS.length);
    });

    it('PREMIUM prompt instructs 3-4 paragraphs (BG)', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      const userPrompt = call.messages[1].content as string;
      expect(userPrompt).toContain('3-4');
    });
  });

  // ------------------------------------------------------------------
  // TC6 — Redis cache
  // ------------------------------------------------------------------
  describe('TC6 — Redis cache', () => {
    const cachedResponse = {
      headline: 'Cached headline',
      body: 'Cached body',
      significantAspects: ['Cached aspect'],
      generatedAt: '2026-03-25T08:00:00.000Z',
    };

    beforeEach(() => {
      _currentUser = MOCK_USER_FREE;
    });

    it('returns cached commentary without calling LLM', async () => {
      (redisClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(cachedResponse));
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(res.body.data.generatedAt).toBe(cachedResponse.generatedAt);
      expect(generateText).not.toHaveBeenCalled();
    });

    it('stores result in Redis with 26h TTL after LLM generation', async () => {
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      await request(app).get('/api/v1/transits/commentary');
      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^transit:commentary:/),
        26 * 60 * 60,
        expect.any(String),
      );
    });

    it('cache key includes userId', async () => {
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      await request(app).get('/api/v1/transits/commentary');
      const cacheKey = (redisClient.setEx as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(cacheKey).toContain(MOCK_USER_FREE.id);
    });

    it('falls through to LLM when Redis get throws', async () => {
      (redisClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis down'));
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(generateText).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // TC7 — Locale
  // ------------------------------------------------------------------
  describe('TC7 — Locale', () => {
    beforeEach(() => {
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
    });

    it('BG user: system prompt and user prompt are in Bulgarian', async () => {
      _currentUser = MOCK_USER_PRO; // language: 'bg'
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      expect(call.messages[0].content).toContain('Ти си Оракулът');
      expect(call.messages[1].content).toContain('Активни планетарни транзити');
    });

    it('EN user: system prompt and user prompt are in English', async () => {
      _currentUser = MOCK_USER_EN; // language: 'en'
      (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({ text: MOCK_LLM_RESPONSE_EN });
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      expect(call.messages[0].content).toContain('You are The Oracle');
      expect(call.messages[1].content).toContain('Active planetary transits');
    });
  });

  // ------------------------------------------------------------------
  // Aspect ranking
  // ------------------------------------------------------------------
  describe('Aspect ranking', () => {
    beforeEach(() => {
      _currentUser = MOCK_USER_PREMIUM;
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
      (getModelIdForTier as ReturnType<typeof vi.fn>).mockReturnValue('claude-opus-4-6');
    });

    it('outer planets ranked before personal planets in prompt', async () => {
      await request(app).get('/api/v1/transits/commentary');
      const call = getLLMCall();
      const userPrompt = call.messages[1].content as string;
      const lines = userPrompt.split('\n').filter((l: string) => l.includes('orb') && l.includes('°'));
      const plutonIdx = lines.findIndex((l: string) => l.includes('Плутон'));
      const marsIdx   = lines.findIndex((l: string) => l.includes('Марс'));
      expect(plutonIdx).toBeGreaterThanOrEqual(0);
      expect(marsIdx).toBeGreaterThanOrEqual(0);
      expect(plutonIdx).toBeLessThan(marsIdx);
    });
  });

  // ------------------------------------------------------------------
  // Error handling
  // ------------------------------------------------------------------
  describe('Error handling', () => {
    beforeEach(() => {
      _currentUser = MOCK_USER_FREE;
      (prisma.birthChart.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_BIRTH_CHART);
    });

    it('returns 500 COMMENTARY_ERROR when LLM throws', async () => {
      (generateText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('LLM timeout'));
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('COMMENTARY_ERROR');
    });

    it('returns 500 when LLM returns non-JSON text', async () => {
      (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({ text: 'I cannot help with that.' });
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('COMMENTARY_ERROR');
    });

    it('cache write failure is non-fatal — still returns 200', async () => {
      (redisClient.setEx as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Redis write fail'));
      const res = await request(app).get('/api/v1/transits/commentary');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
