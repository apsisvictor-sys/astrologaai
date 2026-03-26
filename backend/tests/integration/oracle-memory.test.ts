/**
 * Integration tests — Oracle Memory system (PIX-172)
 * Parent: PIX-100 (FUTURE-02: Long-term Personal Memory / PGVector + RAG)
 *
 * Coverage:
 *  1. Extraction job (PIX-168) — pending implementation; marked it.todo
 *  2. Memory retrieval + Layer 2 injection (PIX-169) — buildSystemPrompt contract
 *  3. GDPR endpoints (PIX-170) — HTTP integration tests against user router
 *  4. Tier gating — injection limits per tier (PREMIUM 5 / PRO 3+30d / FREE 0)
 *
 * Tests in §2 and §3 will FAIL until PIX-169 and PIX-170 are implemented.
 * Extraction tests (§1) are it.todo() — service module does not exist yet.
 */
import request from 'supertest';
import express from 'express';

// ─── Module mocks (must precede all imports that load the mocked modules) ───

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
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    userMemory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    chatMessage: { findMany: vi.fn() },
    chatSession: { findMany: vi.fn() },
    systemPrompt: { findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return { default: mock, prisma: mock };
});

// Mocks for PIX-179 (aspect cooldown) tests — §5
const _pvMock = { $queryRaw: vi.fn(), $executeRaw: vi.fn() };
vi.mock('../../src/utils/prisma-vector', () => ({
  getPrismaVector: vi.fn(() => _pvMock),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
  embed: vi.fn(),
}));

vi.mock('../../src/services/embedding', () => ({
  embedText: vi.fn(),
  embedBatch: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-anthropic-model'),
}));

vi.mock('@ai-sdk/openai', () => {
  const fn = vi.fn(() => 'mock-openai-model') as any;
  fn.embedding = vi.fn(() => 'mock-embedding-model');
  return { openai: fn };
});

vi.mock('../../src/services/agent-tools', () => ({
  createAstrologyTools: vi.fn(() => ({})),
}));

// Controllable auth mock — set _currentUser before each test
let _currentUser: any = null;
vi.mock('../../src/middleware/auth', () => ({
  authMiddleware: vi.fn(async (req: any, res: any, next: any) => {
    if (!_currentUser) {
      return res
        .status(401)
        .json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    }
    req.user = _currentUser;
    next();
  }),
}));

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { prisma } from '../../src/utils/prisma';
import { buildSystemPrompt, ASTROLOGER_SYSTEM_PROMPT } from '../../src/services/llm-helpers';
import userRouter from '../../src/routes/user';
import { getAspectCooldowns } from '../../src/services/memory-retrieval';
import { streamChatCompletion } from '../../src/services/llm';
import { getPrismaVector } from '../../src/utils/prisma-vector';
import { streamText, generateText } from 'ai';
import { embedText } from '../../src/services/embedding';
import { runMemoryExtractionJob } from '../../src/services/memory-extraction-cron';

// ─── Express app for HTTP tests ───────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/v1/user', userRouter);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_USER_FREE    = { id: 'user-free-id',    email: 'free@test.com',    tier: 'FREE',    language: 'en', memoryEnabled: true };
const MOCK_USER_PRO     = { id: 'user-pro-id',     email: 'pro@test.com',     tier: 'PRO',     language: 'en', memoryEnabled: true };
const MOCK_USER_PREMIUM = { id: 'user-premium-id', email: 'premium@test.com', tier: 'PREMIUM', language: 'en', memoryEnabled: true };

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

const MOCK_MEMORY_RECENT = {
  id: 'mem-recent-1',
  userId: 'user-premium-id',
  content: 'User is navigating a major career transition — left a stable job for entrepreneurship.',
  category: 'career',
  sourceDate: daysAgo(10),
  chatIds: ['chat-session-1'],
  createdAt: daysAgo(10),
  lastRecalledAt: null,
};

const MOCK_MEMORY_OLD = {
  id: 'mem-old-1',
  userId: 'user-pro-id',
  content: 'User experienced a painful breakup in late 2025.',
  category: 'love',
  sourceDate: daysAgo(45),
  chatIds: ['chat-session-2'],
  createdAt: daysAgo(45),
  lastRecalledAt: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Extraction job (PIX-168)
//   Service: src/services/memory-extraction-cron.ts
//   runMemoryExtractionJob() → { usersProcessed, totalInserted, totalSkipped }
// ─────────────────────────────────────────────────────────────────────────────

describe('§1 — Extraction job', () => {
  // Advance fake timers to skip delay(1500) between users
  const runJob = async () => {
    const promise = runMemoryExtractionJob();
    await vi.runAllTimersAsync();
    return promise;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (getPrismaVector as ReturnType<typeof vi.fn>).mockReturnValue(_pvMock);
    // Default: dummy embedding, no dedup match, successful insert
    (embedText as ReturnType<typeof vi.fn>).mockResolvedValue(Array(1536).fill(0.01));
    _pvMock.$queryRaw.mockResolvedValue([]);    // no duplicate found
    _pvMock.$executeRaw.mockResolvedValue(undefined);
    (prisma.chatMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({ text: '[]' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('PREMIUM user with 24h chat history → extraction produces ≥1 UserMemory row', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'user-premium-id', sessionId: 'session-1' },
    ]);
    (prisma.chatMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { role: 'USER', content: 'I just quit my job to start my own company.', createdAt: new Date() },
      { role: 'ASSISTANT', content: 'That is a significant life transition...', createdAt: new Date() },
    ]);
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: JSON.stringify([{ content: 'User quit corporate job to start a company.', category: 'career' }]),
    });

    const result = await runJob();

    expect(result.usersProcessed).toBe(1);
    expect(result.totalInserted).toBeGreaterThanOrEqual(1);
    expect(_pvMock.$executeRaw).toHaveBeenCalled();
  });

  it('Duplicate memory (cosine distance < 0.15) is NOT re-inserted — count unchanged', async () => {
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'user-premium-id', sessionId: 'session-1' },
    ]);
    (prisma.chatMessage.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { role: 'USER', content: 'I am training for a marathon.', createdAt: new Date() },
    ]);
    (generateText as ReturnType<typeof vi.fn>).mockResolvedValue({
      text: JSON.stringify([{ content: 'User is training for a marathon.', category: 'health' }]),
    });
    // Dedup check returns a match → duplicate detected, skip insert
    _pvMock.$queryRaw.mockResolvedValue([{ found: 1 }]);

    const result = await runJob();

    expect(result.totalInserted).toBe(0);
    expect(result.totalSkipped).toBeGreaterThanOrEqual(1);
    expect(_pvMock.$executeRaw).not.toHaveBeenCalled();
  });

  it('User with memoryEnabled = false → 0 memories extracted (filtered by SQL WHERE memory_enabled = true)', async () => {
    // The SQL query filters out memory_enabled = false users at DB level
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await runJob();

    expect(result.usersProcessed).toBe(0);
    expect(result.totalInserted).toBe(0);
    expect(_pvMock.$executeRaw).not.toHaveBeenCalled();
  });

  it('FREE user → 0 memories extracted (filtered by SQL WHERE tier IN (PRO, PREMIUM))', async () => {
    // The SQL query filters out FREE users at DB level
    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await runJob();

    expect(result.usersProcessed).toBe(0);
    expect(result.totalInserted).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2 — Memory retrieval + Layer 2 injection (PIX-169)
//   Tested via buildSystemPrompt() in src/services/llm-helpers.ts
//   ChatContext.memories will be added by PIX-169.
//   Tests fail until memories field and injection logic are implemented.
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 — Memory retrieval + Layer 2 injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No custom DB master prompt — use hardcoded constant
    (prisma.systemPrompt.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('PREMIUM user with memories → prompt contains ## Oracle Memory section', async () => {
    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: [MOCK_MEMORY_RECENT],
      tier: 'PREMIUM',
    } as any);

    expect(prompt).toContain('## Oracle Memory');
    expect(prompt).toContain(MOCK_MEMORY_RECENT.content);
  });

  it('FREE user → prompt does NOT contain ## Oracle Memory block', async () => {
    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: [MOCK_MEMORY_RECENT],
      tier: 'FREE',
    } as any);

    expect(prompt).not.toContain('## Oracle Memory');
  });

  it('PRO user with memories older than 30 days → old memories NOT injected', async () => {
    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: [MOCK_MEMORY_OLD], // 45 days old
      tier: 'PRO',
    } as any);

    expect(prompt).not.toContain(MOCK_MEMORY_OLD.content);
  });

  it('PRO user with memories within 30 days → memories ARE injected', async () => {
    const recentProMemory = {
      ...MOCK_MEMORY_RECENT,
      id: 'mem-pro-recent',
      userId: 'user-pro-id',
      sourceDate: daysAgo(20),
    };

    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: [recentProMemory],
      tier: 'PRO',
    } as any);

    expect(prompt).toContain('## Oracle Memory');
    expect(prompt).toContain(recentProMemory.content);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3 — GDPR endpoints (PIX-170)
//   Routes added to src/routes/user.ts by PIX-170.
//   Tests return 404 until routes are implemented.
// ─────────────────────────────────────────────────────────────────────────────

describe('§3 — GDPR endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _currentUser = MOCK_USER_PREMIUM;
  });

  afterEach(() => {
    _currentUser = null;
  });

  // ── DELETE /api/v1/user/memories ─────────────────────────────────────────

  describe('DELETE /api/v1/user/memories — delete all memories', () => {
    it('returns 200 and deletes all memories for the authenticated user', async () => {
      (prisma.userMemory.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

      const res = await request(app).delete('/api/v1/user/memories');

      expect(res.status).toBe(200);
      expect(prisma.userMemory.deleteMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_PREMIUM.id },
      });
    });

    it('succeeds (200) when user has 0 memories — idempotent', async () => {
      (prisma.userMemory.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const res = await request(app).delete('/api/v1/user/memories');

      expect(res.status).toBe(200);
    });

    it('returns 401 when unauthenticated', async () => {
      _currentUser = null;

      const res = await request(app).delete('/api/v1/user/memories');

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/v1/user/memories/:id ─────────────────────────────────────

  describe('DELETE /api/v1/user/memories/:id — delete single memory', () => {
    it('returns 200 and removes the specified memory', async () => {
      // Route does findUnique first (ownership check), then delete
      (prisma.userMemory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: MOCK_USER_PREMIUM.id,
      });
      (prisma.userMemory.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: MOCK_MEMORY_RECENT.id });

      const res = await request(app).delete(`/api/v1/user/memories/${MOCK_MEMORY_RECENT.id}`);

      expect(res.status).toBe(200);
      expect(prisma.userMemory.delete).toHaveBeenCalledWith({
        where: { id: MOCK_MEMORY_RECENT.id },
      });
    });

    it('returns 404 when memory not found', async () => {
      // Route checks findUnique; null → 404
      (prisma.userMemory.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const res = await request(app).delete('/api/v1/user/memories/does-not-exist');

      expect(res.status).toBe(404);
    });

    it('returns 401 when unauthenticated', async () => {
      _currentUser = null;

      const res = await request(app).delete('/api/v1/user/memories/mem-recent-1');

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/user/memories/export ─────────────────────────────────────

  describe('GET /api/v1/user/memories/export — export memories as JSON', () => {
    it('returns 200 with memories array and export metadata', async () => {
      (prisma.userMemory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        MOCK_MEMORY_RECENT,
      ]);

      const res = await request(app).get('/api/v1/user/memories/export');

      // Route returns { exportedAt, userId, totalMemories, memories }
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.memories)).toBe(true);
      expect(res.body.memories).toHaveLength(1);
      expect(res.body.memories[0].content).toBe(MOCK_MEMORY_RECENT.content);
      expect(res.body.memories[0].category).toBe(MOCK_MEMORY_RECENT.category);
      expect(res.body.totalMemories).toBe(1);
      expect(res.body.exportedAt).toBeDefined();
    });

    it('returns 200 with empty memories array when user has no memories', async () => {
      (prisma.userMemory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const res = await request(app).get('/api/v1/user/memories/export');

      expect(res.status).toBe(200);
      expect(res.body.memories).toEqual([]);
      expect(res.body.totalMemories).toBe(0);
    });

    it('scopes query to authenticated user — does not leak other users memories', async () => {
      (prisma.userMemory.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await request(app).get('/api/v1/user/memories/export');

      expect(prisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: MOCK_USER_PREMIUM.id }) })
      );
    });

    it('returns 401 when unauthenticated', async () => {
      _currentUser = null;

      const res = await request(app).get('/api/v1/user/memories/export');

      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/v1/user/settings — memoryEnabled toggle ──────────────────

  describe('PATCH /api/v1/user/settings — memoryEnabled toggle', () => {
    it.todo('PATCH { memoryEnabled: false } → user.memoryEnabled persisted as false in DB');
    it.todo('Extraction job skips user when memoryEnabled = false after toggle');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4 — Tier gating
//   Validates the injection count limits per tier.
//   Tests fail until PIX-169 implements tier-aware truncation.
// ─────────────────────────────────────────────────────────────────────────────

describe('§4 — Tier gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.systemPrompt.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('PREMIUM: up to 5 memories injected from full history', async () => {
    const mems = Array.from({ length: 8 }, (_, i) => ({
      ...MOCK_MEMORY_RECENT,
      id: `mem-prem-${i}`,
      content: `Premium memory content index ${i}`,
    }));

    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: mems,
      tier: 'PREMIUM',
    } as any);

    const injectedCount = mems.filter((m) => prompt.includes(m.content)).length;
    // Must inject at least 1 and no more than 5
    expect(injectedCount).toBeGreaterThanOrEqual(1);
    expect(injectedCount).toBeLessThanOrEqual(5);
  });

  it('PRO: up to 3 memories injected, all within 30-day window', async () => {
    const mems = Array.from({ length: 5 }, (_, i) => ({
      ...MOCK_MEMORY_RECENT,
      id: `mem-pro-${i}`,
      userId: 'user-pro-id',
      content: `Pro memory content index ${i}`,
      sourceDate: daysAgo(15 + i), // all within 30 days
    }));

    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: mems,
      tier: 'PRO',
    } as any);

    const injectedCount = mems.filter((m) => prompt.includes(m.content)).length;
    expect(injectedCount).toBeLessThanOrEqual(3);
  });

  it('PRO: memories outside 30-day window are excluded', async () => {
    const mixedMems = [
      { ...MOCK_MEMORY_RECENT, id: 'mem-within', userId: 'user-pro-id', content: 'Recent PRO memory', sourceDate: daysAgo(10) },
      { ...MOCK_MEMORY_OLD,    id: 'mem-outside', userId: 'user-pro-id', content: 'Old PRO memory excluded', sourceDate: daysAgo(40) },
    ];

    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: mixedMems,
      tier: 'PRO',
    } as any);

    expect(prompt).toContain('Recent PRO memory');
    expect(prompt).not.toContain('Old PRO memory excluded');
  });

  it('FREE: 0 memories injected regardless of how many are supplied', async () => {
    const mems = [MOCK_MEMORY_RECENT, { ...MOCK_MEMORY_RECENT, id: 'mem-2', content: 'Another free memory' }];

    const prompt = await buildSystemPrompt({
      language: 'en',
      memories: mems,
      tier: 'FREE',
    } as any);

    expect(prompt).not.toContain('## Oracle Memory');
    for (const m of mems) {
      expect(prompt).not.toContain(m.content);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5 — Aspect Cooldown pipeline (PIX-179)
//   (a) extraction writes correct aspect_cooldown records — it.todo (needs DB)
//   (b) getAspectCooldowns() query returns correct results
//   (c) Layer 2 injection includes ASPECT ROTATION GUIDANCE when data exists
//   (d) injection is absent when no cooldown data
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 — Aspect Cooldown pipeline (PIX-179)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getPrismaVector as ReturnType<typeof vi.fn>).mockReturnValue(_pvMock);
  });

  // ── (a) Extraction ────────────────────────────────────────────────────────

  it.todo(
    '(a) extraction job writes aspect_cooldown record when Oracle featured an aspect prominently',
  );

  it.todo(
    '(a) extraction job writes NO aspect_cooldown records when Oracle messages contain no aspects',
  );

  // ── (b) getAspectCooldowns() query ────────────────────────────────────────

  it('(b) returns parsed aspect cooldowns from DB rows within 7-day window', async () => {
    const now = new Date();
    _pvMock.$queryRaw.mockResolvedValue([
      { content: JSON.stringify({ aspect: 'Sun conjunct Moon', cooldownLevel: 2 }), source_date: now },
      { content: JSON.stringify({ aspect: 'Saturn square Venus', cooldownLevel: 1 }), source_date: now },
    ]);

    const result = await getAspectCooldowns('user-123');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ aspect: 'Sun conjunct Moon', cooldownLevel: 2 });
    expect(result[1]).toMatchObject({ aspect: 'Saturn square Venus', cooldownLevel: 1 });
  });

  it('(b) skips malformed JSON rows without throwing', async () => {
    _pvMock.$queryRaw.mockResolvedValue([
      { content: 'not-json', source_date: new Date() },
      { content: JSON.stringify({ aspect: 'Jupiter trine Mars', cooldownLevel: 1 }), source_date: new Date() },
    ]);

    const result = await getAspectCooldowns('user-123');

    expect(result).toHaveLength(1);
    expect(result[0].aspect).toBe('Jupiter trine Mars');
  });

  it('(b) returns [] when DB query fails (non-fatal)', async () => {
    _pvMock.$queryRaw.mockRejectedValue(new Error('DB unavailable'));

    const result = await getAspectCooldowns('user-123');

    expect(result).toEqual([]);
  });

  it('(b) returns [] when no aspect records exist in 7-day window', async () => {
    _pvMock.$queryRaw.mockResolvedValue([]);

    const result = await getAspectCooldowns('user-123');

    expect(result).toEqual([]);
  });

  // ── (c) Layer 2 injection when cooldown data exists ───────────────────────

  it('(c) streamChatCompletion injects ASPECT ROTATION GUIDANCE block for PRO user with cooldowns', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

    // Seed cooldown data via getPrismaVector mock
    _pvMock.$queryRaw.mockResolvedValue([
      { content: JSON.stringify({ aspect: 'Pluto opposite Sun', cooldownLevel: 2 }), source_date: new Date() },
    ]);

    // Capture messages passed to streamText
    let capturedMessages: any[] = [];
    (streamText as ReturnType<typeof vi.fn>).mockImplementation(({ messages }) => {
      capturedMessages = messages;
      return {
        fullStream: (async function* () {
          yield { type: 'finish', totalUsage: { inputTokens: 0, outputTokens: 0 } };
        })(),
      };
    });

    const systemContent = ASTROLOGER_SYSTEM_PROMPT + '\n\nDynamic Layer 2 context here.';
    const gen = streamChatCompletion(
      [{ role: 'system', content: systemContent }, { role: 'user', content: 'test question' }],
      { tier: 'PRO', userId: 'user-123' },
    );
    for await (const _chunk of gen) { /* consume */ }

    const allSystemContent = capturedMessages
      .filter(m => m.role === 'system')
      .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n');

    expect(allSystemContent).toContain('ASPECT ROTATION GUIDANCE');
    expect(allSystemContent).toContain('Pluto opposite Sun');
    expect(allSystemContent).toContain('deprioritize');

    vi.unstubAllEnvs();
  });

  // ── (d) injection absent when no cooldown data ────────────────────────────

  it('(d) streamChatCompletion does NOT inject guidance block when no cooldowns exist', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

    _pvMock.$queryRaw.mockResolvedValue([]);

    let capturedMessages: any[] = [];
    (streamText as ReturnType<typeof vi.fn>).mockImplementation(({ messages }) => {
      capturedMessages = messages;
      return {
        fullStream: (async function* () {
          yield { type: 'finish', totalUsage: { inputTokens: 0, outputTokens: 0 } };
        })(),
      };
    });

    const systemContent = ASTROLOGER_SYSTEM_PROMPT + '\n\nDynamic Layer 2 context here.';
    const gen = streamChatCompletion(
      [{ role: 'system', content: systemContent }, { role: 'user', content: 'test question' }],
      { tier: 'PRO', userId: 'user-456' },
    );
    for await (const _chunk of gen) { /* consume */ }

    const allSystemContent = capturedMessages
      .filter(m => m.role === 'system')
      .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('\n');

    expect(allSystemContent).not.toContain('ASPECT ROTATION GUIDANCE');

    vi.unstubAllEnvs();
  });
});
