import { z } from 'zod';

// Password requirements: 8+ chars, 1 uppercase, 1 number
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

// Email validation schema - trim and lowercase first, then validate
const emailSchema = z
  .string()
  .transform((email) => email.toLowerCase().trim())
  .pipe(
    z
      .string()
      .min(1, 'Email is required')
      .max(255, 'Email must be less than 255 characters')
      .email('Invalid email format')
  );

export const registerSchema = z.object({
  email: emailSchema,
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
