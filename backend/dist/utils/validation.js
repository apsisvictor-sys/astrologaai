"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
exports.formatZodErrors = formatZodErrors;
const zod_1 = require("zod");
// Password requirements: 8+ chars, 1 uppercase, 1 number
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
// Supported languages (US-26)
const SUPPORTED_LANGUAGES = ['bg', 'en'];
exports.registerSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email format')
        .min(1, 'Email is required')
        .max(255, 'Email must be less than 255 characters')
        .transform((email) => email.toLowerCase().trim()),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be less than 128 characters')
        .regex(passwordRegex, 'Password must contain at least 1 uppercase letter and 1 number'),
    fullName: zod_1.z
        .string()
        .min(1, 'Name must not be empty if provided')
        .max(100, 'Name must be less than 100 characters')
        .transform((name) => name.trim())
        .optional(),
    // US-26: Language preference on registration
    language: zod_1.z
        .enum(SUPPORTED_LANGUAGES)
        .optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Invalid email format')
        .transform((email) => email.toLowerCase().trim()),
    password: zod_1.z.string().min(1, 'Password is required'),
});
function formatZodErrors(error) {
    return error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));
}
//# sourceMappingURL=validation.js.map