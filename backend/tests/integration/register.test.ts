import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Mock jsonwebtoken before importing routes
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockImplementation((payload) => {
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `mock-token-header.${base64Payload}.mock-signature`;
  }),
  verify: jest.fn(),
  decode: jest.fn().mockImplementation((token) => {
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        return JSON.parse(Buffer.from(parts[1], 'base64').toString());
      } catch {
        return null;
      }
    }
    return null;
  }),
}));

// Mock Prisma before importing routes
jest.mock('../../src/utils/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  profile: {
    create: jest.fn(),
  },
  usageRecord: {
    create: jest.fn(),
  },
}));

// Import controller directly for testing without rate limiting
import { AuthController } from '../../src/controllers/authController';
import prisma from '../../src/utils/prisma';

// Create test app without rate limiting for most tests
const createTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Mount routes directly without rate limiting middleware
  app.post('/api/v1/auth/register', AuthController.register);
  app.post('/api/v1/auth/login', AuthController.login);
  
  return app;
};

describe('POST /api/v1/auth/register', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('Validation errors', () => {
    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          password: 'Password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for password without uppercase', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for password without number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Passwords',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return validation details in error response', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toBeDefined();
      expect(Array.isArray(response.body.error.details)).toBe(true);
    });
  });

  describe('Successful registration (mocked)', () => {
    it('should return 201 for successful registration', async () => {
      // Setup mock return values
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        fullName: 'Test User',
        tier: 'FREE',
        language: 'bg',
        emailVerified: false,
        createdAt: new Date(),
      });
      (prisma.profile.create as jest.Mock).mockResolvedValue({});
      (prisma.usageRecord.create as jest.Mock).mockResolvedValue({});

      const validData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        fullName: 'Test User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(validData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.tier).toBe('FREE');
      expect(response.body.data.user.language).toBe('bg');
    });

    it('should return 409 for duplicate email', async () => {
      // Setup mock to simulate existing user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should normalize email to lowercase', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'test@example.com', // Should be lowercased
        fullName: null,
        tier: 'FREE',
        language: 'bg',
        emailVerified: false,
        createdAt: new Date(),
      });
      (prisma.profile.create as jest.Mock).mockResolvedValue({});
      (prisma.usageRecord.create as jest.Mock).mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'SecurePass123',
        });

      expect(response.status).toBe(201);
      // Check that user.create was called with lowercase email
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.email).toBe('test@example.com');
    });
  });
});