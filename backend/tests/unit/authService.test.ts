import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/authService';

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
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

// Import the mocked prisma
import prisma from '../src/utils/prisma';

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate valid access and refresh tokens', () => {
      const tokens = AuthService.generateTokens('user-123', 'test@example.com');

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBeGreaterThan(0);

      // Verify access token
      const decodedAccess = jwt.decode(tokens.accessToken) as { userId: string; email: string };
      expect(decodedAccess.userId).toBe('user-123');
      expect(decodedAccess.email).toBe('test@example.com');

      // Verify refresh token
      const decodedRefresh = jwt.decode(tokens.refreshToken) as { userId: string; email: string; type: string };
      expect(decodedRefresh.userId).toBe('user-123');
      expect(decodedRefresh.email).toBe('test@example.com');
      expect(decodedRefresh.type).toBe('refresh');
    });

    it('should generate tokens with correct expiration times', () => {
      const originalEnv = process.env.JWT_EXPIRES_IN;
      process.env.JWT_EXPIRES_IN = '1h';

      const tokens = AuthService.generateTokens('user-123', 'test@example.com');
      
      // 1 hour = 3600 seconds
      expect(tokens.expiresIn).toBe(3600);

      process.env.JWT_EXPIRES_IN = originalEnv;
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'Password123';
      const hash = await bcrypt.hash(password, 12);

      const result = await AuthService.verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'Password123';
      const hash = await bcrypt.hash(password, 12);

      const result = await AuthService.verifyPassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload for valid token', () => {
      const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const token = jwt.sign({ userId: 'user-123', email: 'test@example.com' }, secret);

      const result = AuthService.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe('user-123');
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for invalid token', () => {
      const result = AuthService.verifyToken('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const token = jwt.sign(
        { userId: 'user-123', email: 'test@example.com' },
        secret,
        { expiresIn: '-1h' } // Already expired
      );

      const result = AuthService.verifyToken(token);
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should throw error if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      });

      await expect(
        AuthService.register({
          email: 'existing@example.com',
          password: 'Password123',
        })
      ).rejects.toEqual({
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
        statusCode: 409,
      });
    });

    it('should create user with correct default values', async () => {
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

      const result = await AuthService.register({
        email: 'newuser@example.com',
        password: 'Password123',
        fullName: 'Test User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.tier).toBe('FREE');
      expect(result.user.language).toBe('bg');
      expect(result.user.emailVerified).toBe(false);
      expect(result.session.accessToken).toBeDefined();
      expect(result.session.refreshToken).toBeDefined();
    });

    it('should hash the password before storing', async () => {
      const password = 'Password123';
      let storedHash: string | undefined;

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation((data: { data: { passwordHash: string } }) => {
        storedHash = data.data.passwordHash;
        return Promise.resolve({
          id: 'new-user-id',
          email: 'newuser@example.com',
          fullName: null,
          tier: 'FREE',
          language: 'bg',
          emailVerified: false,
          createdAt: new Date(),
        });
      });
      (prisma.profile.create as jest.Mock).mockResolvedValue({});
      (prisma.usageRecord.create as jest.Mock).mockResolvedValue({});

      await AuthService.register({
        email: 'newuser@example.com',
        password,
      });

      // Verify the stored hash is not the plain password
      expect(storedHash).toBeDefined();
      expect(storedHash).not.toBe(password);
      
      // Verify the hash is a valid bcrypt hash
      expect(storedHash?.startsWith('$2')).toBe(true);
      
      // Verify we can compare the password with the hash
      const isValid = await bcrypt.compare(password, storedHash!);
      expect(isValid).toBe(true);
    });

    it('should create profile with default notification preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        fullName: null,
        tier: 'FREE',
        language: 'bg',
        emailVerified: false,
        createdAt: new Date(),
      });
      
      let profileData: Record<string, unknown> | undefined;
      (prisma.profile.create as jest.Mock).mockImplementation((data: { data: Record<string, unknown> }) => {
        profileData = data.data;
        return Promise.resolve({});
      });
      (prisma.usageRecord.create as jest.Mock).mockResolvedValue({});

      await AuthService.register({
        email: 'newuser@example.com',
        password: 'Password123',
      });

      expect(profileData?.notificationPrefs).toEqual({
        email: true,
        push: false,
        dailyHoroscope: true,
        weeklyForecast: true,
      });
    });

    it('should create usage record for current month', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'newuser@example.com',
        fullName: null,
        tier: 'FREE',
        language: 'bg',
        emailVerified: false,
        createdAt: new Date(),
      });
      (prisma.profile.create as jest.Mock).mockResolvedValue({});
      
      let usageData: Record<string, unknown> | undefined;
      (prisma.usageRecord.create as jest.Mock).mockImplementation((data: { data: Record<string, unknown> }) => {
        usageData = data.data;
        return Promise.resolve({});
      });

      await AuthService.register({
        email: 'newuser@example.com',
        password: 'Password123',
      });

      const currentMonth = new Date().toISOString().slice(0, 7);
      expect(usageData?.month).toBe(currentMonth);
      expect(usageData?.queryCount).toBe(0);
    });
  });
});
