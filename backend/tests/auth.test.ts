import { registerSchema, formatZodErrors } from '../src/utils/validation';

describe('Registration Validation', () => {
  describe('Email validation', () => {
    it('should accept valid email addresses', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = registerSchema.safeParse({
        email: 'invalid-email',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some(e => e.field === 'email')).toBe(true);
      }
    });

    it('should lowercase email addresses', () => {
      const result = registerSchema.safeParse({
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should trim whitespace from email', () => {
      const result = registerSchema.safeParse({
        email: '  test@example.com  ',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject empty email', () => {
      const result = registerSchema.safeParse({
        email: '',
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject email longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = registerSchema.safeParse({
        email: longEmail,
        password: 'Password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Password validation', () => {
    it('should accept valid passwords', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some(e => e.field === 'password' && e.message.includes('8 characters'))).toBe(true);
      }
    });

    it('should reject passwords without uppercase letter', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some(e => e.field === 'password' && e.message.includes('uppercase'))).toBe(true);
      }
    });

    it('should reject passwords without number', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Passwords',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = formatZodErrors(result.error);
        expect(errors.some(e => e.field === 'password' && e.message.includes('number'))).toBe(true);
      }
    });

    it('should reject passwords longer than 128 characters', () => {
      const longPassword = 'A1' + 'a'.repeat(127);
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: longPassword,
      });
      expect(result.success).toBe(false);
    });

    it('should accept passwords with special characters', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'P@ssword123!',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Full name validation', () => {
    it('should accept valid names', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        fullName: 'John Doe',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('John Doe');
      }
    });

    it('should trim whitespace from name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        fullName: '  John Doe  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe('John Doe');
      }
    });

    it('should accept registration without full name', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBeUndefined();
      }
    });

    it('should reject names longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password123',
        fullName: longName,
      });
      expect(result.success).toBe(false);
    });
  });
});
