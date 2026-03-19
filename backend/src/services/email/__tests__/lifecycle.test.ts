import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-id' }) },
  })),
}));

// Mock prisma
vi.mock('../../../utils/prisma', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn().mockResolvedValue({ unsubscribeToken: 'test-token-123' }),
      upsert: vi.fn(),
    },
    chatSession: { count: vi.fn().mockResolvedValue(0) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

// Mock redis — only setEx and get are used (no separate expire)
vi.mock('../../../utils/redis', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    setEx: vi.fn().mockResolvedValue('OK'),
  },
}));

describe('Lifecycle email service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runLifecycleCron returns stats object', async () => {
    const { runLifecycleCron } = await import('../lifecycle');
    const result = await runLifecycleCron();
    expect(result).toHaveProperty('processed');
    expect(result).toHaveProperty('sent');
    expect(result).toHaveProperty('errors');
  });

  it('sendWelcomeEmail skips if already sent (dedup)', async () => {
    const { redisClient } = await import('../../../utils/redis');
    vi.mocked(redisClient.get).mockResolvedValueOnce('1'); // already sent
    const { sendWelcomeEmail } = await import('../lifecycle');
    // Should not throw — just skip
    await expect(sendWelcomeEmail('user-1', 'test@example.com', 'Alex', 'en')).resolves.toBeUndefined();
  });
});
