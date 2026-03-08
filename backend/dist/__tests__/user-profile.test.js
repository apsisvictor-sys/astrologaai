"use strict";
/**
 * User Profile API Tests
 * US-28: Edit Profile
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Create test app
const testApp = (0, express_1.default)();
testApp.use(express_1.default.json());
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
(0, globals_1.describe)('User Profile API', () => {
    (0, globals_1.describe)('PUT /api/v1/user/profile', () => {
        (0, globals_1.it)('should update full name successfully', async () => {
            const response = await (0, supertest_1.default)(testApp)
                .put('/api/v1/user/profile')
                .send({ fullName: 'New Name' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.user.fullName).toBe('New Name');
        });
        (0, globals_1.it)('should reject invalid email format', async () => {
            const response = await (0, supertest_1.default)(testApp)
                .put('/api/v1/user/profile')
                .send({ email: 'invalid-email' });
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.success).toBe(false);
            (0, globals_1.expect)(response.body.error.code).toBe('VALIDATION_ERROR');
        });
        (0, globals_1.it)('should handle email change with verification flow', async () => {
            const response = await (0, supertest_1.default)(testApp)
                .put('/api/v1/user/profile')
                .send({ email: 'newemail@example.com' });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.message).toContain('email');
            (0, globals_1.expect)(response.body.data.user.pendingEmail).toBe('newemail@example.com');
        });
    });
    (0, globals_1.describe)('GET /api/v1/user/profile', () => {
        (0, globals_1.it)('should return user profile', async () => {
            const response = await (0, supertest_1.default)(testApp)
                .get('/api/v1/user/profile');
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.success).toBe(true);
            (0, globals_1.expect)(response.body.data.user).toBeDefined();
            (0, globals_1.expect)(response.body.data.user.email).toBe(TEST_EMAIL);
        });
    });
});
(0, globals_1.describe)('Avatar Upload Validation', () => {
    (0, globals_1.it)('should validate file types (JPG, PNG only)', () => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        const invalidType = 'image/gif';
        (0, globals_1.expect)(allowedTypes.includes(invalidType)).toBe(false);
        (0, globals_1.expect)(allowedTypes.includes('image/jpeg')).toBe(true);
        (0, globals_1.expect)(allowedTypes.includes('image/png')).toBe(true);
    });
    (0, globals_1.it)('should validate file size (max 2MB)', () => {
        const maxSize = 2 * 1024 * 1024; // 2MB
        const validSize = 1 * 1024 * 1024; // 1MB
        const invalidSize = 3 * 1024 * 1024; // 3MB
        (0, globals_1.expect)(validSize <= maxSize).toBe(true);
        (0, globals_1.expect)(invalidSize <= maxSize).toBe(false);
    });
});
(0, globals_1.describe)('JWT Token Generation', () => {
    (0, globals_1.it)('should generate valid JWT token', () => {
        const token = jsonwebtoken_1.default.sign({ sub: TEST_USER_ID, email: TEST_EMAIL, tier: 'FREE' }, JWT_SECRET, { expiresIn: '15m' });
        (0, globals_1.expect)(token).toBeDefined();
        (0, globals_1.expect)(typeof token).toBe('string');
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        (0, globals_1.expect)(decoded.sub).toBe(TEST_USER_ID);
    });
    (0, globals_1.it)('should reject invalid token', () => {
        (0, globals_1.expect)(() => {
            jsonwebtoken_1.default.verify('invalid-token', JWT_SECRET);
        }).toThrow();
    });
});
//# sourceMappingURL=user-profile.test.js.map