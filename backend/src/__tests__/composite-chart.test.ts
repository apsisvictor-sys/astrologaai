/**
 * Integration Tests: GET /api/partners/:id/composite
 * PIX-138 / FEAT-11: Composite chart endpoint (PREMIUM only)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// ---- Mock env before any module loads ----
process.env.JWT_SECRET = 'test-secret';
process.env.ASTROLOGY_API_KEY = 'test-astro-key';

// ---- Mock auth middleware ----
vi.mock('../../src/middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com', tier: 'PREMIUM' };
    next();
  },
}));

// ---- Mock Prisma ----
vi.mock('../../src/utils/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    birthProfile: { findFirst: vi.fn() },
    partner: { findFirst: vi.fn() },
  },
}));

// ---- Mock composite service ----
vi.mock('../../src/services/composite.service', () => ({
  calculateCompositeChart: vi.fn(),
}));

// ---- Imports after mocks ----
import { prisma } from '../../src/utils/prisma';
import { calculateCompositeChart } from '../../src/services/composite.service';
import partnerRoutes from '../../src/routes/partners';

// ---- Test fixtures ----
const PREMIUM_USER = { id: 'user-123', email: 'test@example.com', tier: 'PREMIUM' };
const PRO_USER    = { id: 'user-123', email: 'test@example.com', tier: 'PRO' };
const FREE_USER   = { id: 'user-123', email: 'test@example.com', tier: 'FREE' };

const BIRTH_PROFILE = {
  id: 'bp-1',
  userId: 'user-123',
  birthDate: new Date('1990-05-15'),
  birthTime: '10:30',
  latitude: 42.6977,
  longitude: 23.3219,
  timezone: 'Europe/Sofia',
};

const PARTNER = {
  id: 'partner-456',
  userId: 'user-123',
  name: 'Maria',
  label: null,
  relationshipType: 'ROMANTIC',
  birthDate: new Date('1992-08-20'),
  birthTime: '14:00',
  locationName: 'Plovdiv, Bulgaria',
  latitude: 42.1354,
  longitude: 24.7453,
  timezone: 'Europe/Sofia',
  isUnknownTime: false,
  chartSummary: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_COMPOSITE = {
  sun: { sign: 'Libra', degree: 15 },
  moon: { sign: 'Cancer', degree: 22 },
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/partners', partnerRoutes);
  return app;
}

// ---- Tests ----
describe('GET /api/partners/:id/composite', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
    (calculateCompositeChart as any).mockResolvedValue(MOCK_COMPOSITE);
  });

  // -----------------------------------------------------------
  // 200 — Happy path
  // -----------------------------------------------------------
  it('200: PREMIUM user with valid birth data and partner returns composite', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(PREMIUM_USER);
    (prisma.birthProfile.findFirst as any).mockResolvedValue(BIRTH_PROFILE);
    (prisma.partner.findFirst as any).mockResolvedValue(PARTNER);

    const res = await request(app)
      .get('/api/partners/partner-456/composite')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Response shape: data.composite + data.partner
    expect(res.body.data.composite).toEqual(MOCK_COMPOSITE);
    expect(res.body.data.partner).toBeDefined();
    expect(res.body.data.partner.id).toBe('partner-456');
    expect(res.body.data.partner.name).toBe('Maria');
    expect(res.body.data.partner.relationshipType).toBe('romantic');
  });

  // -----------------------------------------------------------
  // 403 — Tier gate (FREE)
  // -----------------------------------------------------------
  it('403: FREE user is denied with PREMIUM_REQUIRED', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(FREE_USER);

    const res = await request(app)
      .get('/api/partners/partner-456/composite')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PREMIUM_REQUIRED');
    expect(res.body.error.upgradeRequired).toBe(true);
  });

  // -----------------------------------------------------------
  // 403 — Tier gate (PRO)
  // -----------------------------------------------------------
  it('403: PRO user is denied with PREMIUM_REQUIRED', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(PRO_USER);

    const res = await request(app)
      .get('/api/partners/partner-456/composite')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PREMIUM_REQUIRED');
    expect(res.body.error.upgradeRequired).toBe(true);
  });

  // -----------------------------------------------------------
  // 404 — Unknown partner
  // -----------------------------------------------------------
  it('404: unknown partner returns NOT_FOUND', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(PREMIUM_USER);
    (prisma.birthProfile.findFirst as any).mockResolvedValue(BIRTH_PROFILE);
    (prisma.partner.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/partners/nonexistent-id/composite')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // -----------------------------------------------------------
  // 400 — No birth data
  // -----------------------------------------------------------
  it('400: user with no birth data returns BIRTH_DATA_REQUIRED', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(PREMIUM_USER);
    (prisma.birthProfile.findFirst as any).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/partners/partner-456/composite')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BIRTH_DATA_REQUIRED');
  });
});
