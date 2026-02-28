import { z } from 'zod';

// Password requirements: 8+ chars, 1 uppercase, 1 number
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// Supported languages (US-26)
const SUPPORTED_LANGUAGES = ['bg', 'en'] as const;

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      passwordRegex,
      'Password must contain at least 1 uppercase letter and 1 number'
    ),
  fullName: z
    .string()
    .min(1, 'Name must not be empty if provided')
    .max(100, 'Name must be less than 100 characters')
    .transform((name) => name.trim())
    .optional(),
  // US-26: Language preference on registration
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((email) => email.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Error response helper
export interface ValidationError {
  field: string;
  message: string;
}

export function formatZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
