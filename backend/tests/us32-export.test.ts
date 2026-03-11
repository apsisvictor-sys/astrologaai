/**
 * Export Controller Tests
 * US-32: Export User Data (GDPR Data Portability)
 */

import request from 'supertest';
import app from '../src/index';
import prisma from '../src/utils/prisma';
import * as bcrypt from 'bcryptjs';
import { redisClient } from '../src/utils/redis';

describe('US-32: Export User Data', () => {
  let accessToken: string;
  let testUserId: string;
  const testEmail = `export-test-${Date.now()}@test.com`;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        fullName: 'Export Test User',
        language: 'en',
        tier: 'FREE',
      },
    });
    testUserId = user.id;

    // Create profile
    await prisma.profile.create({
      data: {
        userId: testUserId,
        onboardingComplete: true,
      },
    });

    // Login to get access token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    accessToken = loginResponse.body.data?.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.notificationPreference.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.profile.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch (e) {
      // Ignore cleanup errors
    }

    // Clean up any test exports from Redis
    try {
      const keys = await redisClient.keys('export:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (e) {
      // Ignore Redis cleanup errors
    }
  });

  describe('POST /api/v1/user/export', () => {
    it.skip('should create an export request with JSON format', async () => {
      const response = await request(app)
        .post('/api/v1/user/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ format: 'json' });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBeDefined();
      expect(response.body.data.exportId).toMatch(/^exp_/);
      expect(response.body.data.format).toBe('json');
      expect(response.body.data.status).toBe('pending');
    });

    it.skip('should create an export request with PDF format', async () => {
      const response = await request(app)
        .post('/api/v1/user/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ format: 'pdf' });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('pdf');
    });

    it.skip('should reject invalid format', async () => {
      const response = await request(app)
        .post('/api/v1/user/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ format: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it.skip('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/user/export')
        .send({ format: 'json' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/user/export/list', () => {
    it.skip('should list user export history', async () => {
      const response = await request(app)
        .get('/api/v1/user/export/list')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exports).toBeDefined();
      expect(Array.isArray(response.body.data.exports)).toBe(true);
    });

    it.skip('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/user/export/list');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/user/export/:id', () => {
    let exportId: string;

    beforeEach(async () => {
      // Create an export request first
      const response = await request(app)
        .post('/api/v1/user/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ format: 'json' });

      exportId = response.body.data.exportId;
    });

    it.skip('should get export status', async () => {
      const response = await request(app)
        .get(`/api/v1/user/export/${exportId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBe(exportId);
      expect(response.body.data.format).toBeDefined();
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it.skip('should return 404 for non-existent export', async () => {
      const response = await request(app)
        .get('/api/v1/user/export/exp_nonexistent')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it.skip('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/user/export/${exportId}`);

      expect(response.status).toBe(401);
    });
  });
});
