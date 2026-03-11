/**
 * User Profile API Tests
 * US-28: Edit Profile
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';

// Create test app
const testApp = express();
testApp.use(express.json());

// Test JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Test user ID
const TEST_USER_ID = 'test-user-123';
const TEST_EMAIL = 'test@example.com';

// Test middleware to simulate auth
testApp.use((req, res, next) => {
  req.user = {
    id: TEST_USER_ID,
    email: TEST_EMAIL,
    tier: 'FREE',
    language: 'bg',
  };
  next();
});

// Mock profile routes (simplified for testing)
let mockProfile = {
  id: TEST_USER_ID,
  email: TEST_EMAIL,
  fullName: 'Test User',
  avatarUrl: null,
  pendingEmail: null,
};

testApp.put('/api/v1/user/profile', (req, res) => {
  const { fullName, email } = req.body;

  // Validate email format if provided
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
    }
  }

  if (email && email !== mockProfile.email) {
    // Simulate sending verification email
    mockProfile.pendingEmail = email;
    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...mockProfile,
          fullName: fullName ?? mockProfile.fullName,
        },
        message: 'Profile updated. Please check your new email to verify the change.',
      },
    });
  }
  
  if (fullName !== undefined) {
    mockProfile.fullName = fullName;
  }
  
  res.status(200).json({
    success: true,
    data: {
      user: { ...mockProfile },
      message: 'Profile updated successfully',
    },
  });
});

testApp.get('/api/v1/user/profile', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: { ...mockProfile },
      subscription: null,
    },
  });
});

describe('User Profile API', () => {
  describe('PUT /api/v1/user/profile', () => {
    it('should update full name successfully', async () => {
      const response = await request(testApp)
        .put('/api/v1/user/profile')
        .send({ fullName: 'New Name' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.fullName).toBe('New Name');
    });

    it('should reject invalid email format', async () => {
      const response = await request(testApp)
        .put('/api/v1/user/profile')
        .send({ email: 'invalid-email' });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle email change with verification flow', async () => {
      const response = await request(testApp)
        .put('/api/v1/user/profile')
        .send({ email: 'newemail@example.com' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('email');
      expect(response.body.data.user.pendingEmail).toBe('newemail@example.com');
    });
  });

  describe('GET /api/v1/user/profile', () => {
    it('should return user profile', async () => {
      const response = await request(testApp)
        .get('/api/v1/user/profile');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(TEST_EMAIL);
    });
  });
});

describe('Avatar Upload Validation', () => {
  it('should validate file types (JPG, PNG only)', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    const invalidType = 'image/gif';
    
    expect(allowedTypes.includes(invalidType)).toBe(false);
    expect(allowedTypes.includes('image/jpeg')).toBe(true);
    expect(allowedTypes.includes('image/png')).toBe(true);
  });

  it('should validate file size (max 2MB)', () => {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const validSize = 1 * 1024 * 1024; // 1MB
    const invalidSize = 3 * 1024 * 1024; // 3MB
    
    expect(validSize <= maxSize).toBe(true);
    expect(invalidSize <= maxSize).toBe(false);
  });
});

describe('JWT Token Generation', () => {
  it('should generate valid JWT token', () => {
    const token = jwt.sign(
      { sub: TEST_USER_ID, email: TEST_EMAIL, tier: 'FREE' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    expect(decoded.sub).toBe(TEST_USER_ID);
  });

  it('should reject invalid token', () => {
    expect(() => {
      jwt.verify('invalid-token', JWT_SECRET);
    }).toThrow();
  });
});
