import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { RegisterInput } from '../utils/validation';

const SALT_ROUNDS = 12;

export interface RegisterResult {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    tier: string;
    language: string;
    emailVerified: boolean;
    createdAt: Date;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterInput): Promise<RegisterResult> {
    const { email, password, fullName } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw {
        code: 'EMAIL_EXISTS',
        message: 'An account with this email already exists',
        statusCode: 409,
      } as AuthError;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user with default preferences
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        tier: 'FREE',
        language: 'bg',
        emailVerified: false,
      },
    });

    // Create default profile with notification preferences
    await prisma.profile.create({
      data: {
        userId: user.id,
        notificationPrefs: {
          email: true,
          push: false,
          dailyHoroscope: true,
          weeklyForecast: true,
        },
      },
    });

    // Create usage record for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"
    await prisma.usageRecord.create({
      data: {
        userId: user.id,
        month: currentMonth,
        queryCount: 0,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        tier: user.tier,
        language: user.language,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      session: tokens,
    };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  static generateTokens(userId: string, email: string) {
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const accessToken = jwt.sign(
      { userId, email },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId, email, type: 'refresh' },
      jwtSecret,
      { expiresIn: jwtRefreshExpiresIn }
    );

    // Calculate expiration time in seconds
    const expiresIn = this.parseExpiresIn(jwtExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Parse JWT expiresIn string to seconds
   */
  private static parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // Default 15 minutes
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
      return decoded;
    } catch {
      return null;
    }
  }
}

export default AuthService;
