"use strict";
/**
 * AstroLogAI Backend API Server
 * Main entry point
 *
 * US-10: WebSocket support via Socket.io
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = require("dotenv");
const http_1 = require("http");
const runtime_1 = require("./config/runtime");
const envValidation_1 = require("./config/envValidation");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const chat_1 = __importDefault(require("./routes/chat"));
const birthChart_1 = __importDefault(require("./routes/birthChart"));
const birthData_1 = __importDefault(require("./routes/birthData"));
const locations_1 = __importDefault(require("./routes/locations"));
const forecasts_1 = __importDefault(require("./routes/forecasts"));
const partners_1 = __importDefault(require("./routes/partners"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const language_1 = __importDefault(require("./routes/language"));
const llm_1 = __importDefault(require("./routes/llm")); // US-34: LLM Provider Fallback
const compatibility_1 = __importDefault(require("./routes/compatibility")); // US-20: Compatibility Analysis
const cron_1 = __importDefault(require("./routes/cron")); // US-36: Monthly Reset Cron
const astrology_1 = __importDefault(require("./routes/astrology")); // US-33: Astrology API Fallback
const admin_1 = __importDefault(require("./routes/admin")); // Step 11: Admin Dashboard
// US-37: Rate limit headers middleware
const rateLimitHeaders_1 = require("./middleware/rateLimitHeaders");
// Import Socket.io
const socket_1 = require("./socket");
// US-30: Chart regeneration processor
const chart_regeneration_1 = require("./services/chart-regeneration");
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = runtime_1.runtimeConfig.port;
// Create HTTP server for Socket.io
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
// ============================================
// MIDDLEWARE
// ============================================
// Security headers
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowed = (0, runtime_1.isOriginAllowed)(origin);
        if (!allowed) {
            console.warn(`[CORS] Blocked origin: ${origin || 'unknown'}`);
        }
        return callback(null, allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Requested-With'],
    optionsSuccessStatus: 204,
}));
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// General rate limiting
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter);
// US-37: Add rate limit headers to all responses
app.use(rateLimitHeaders_1.rateLimitHeadersMiddleware);
// US-37: Fetch rate limit status for authenticated requests
app.use(rateLimitHeaders_1.fetchRateLimitStatus);
// ============================================
// ROUTES
// ============================================
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        websocket: 'enabled',
    });
});
app.get('/health/env', (_req, res) => {
    const report = (0, envValidation_1.getEnvValidationReport)();
    res.status(report.ok ? 200 : 503).json({
        status: report.ok ? 'ok' : 'degraded',
        env: report,
    });
});
// Health check for database
app.get('/health/db', async (req, res) => {
    try {
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        await prisma.$queryRaw `SELECT 1`;
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});
// Health check for Redis
app.get('/health/redis', async (req, res) => {
    try {
        const { redisClient } = await Promise.resolve().then(() => __importStar(require('./utils/redis')));
        await redisClient.ping();
        res.json({ status: 'ok', redis: 'connected' });
    }
    catch (error) {
        res.status(503).json({ status: 'error', redis: 'disconnected' });
    }
});
// Health check for Astrology API (US-33)
app.get('/health/astrology', async (req, res) => {
    try {
        const { getAstrologyOrchestrator } = await Promise.resolve().then(() => __importStar(require('./services/astrology/astrology-orchestrator')));
        const orchestrator = getAstrologyOrchestrator();
        const health = await orchestrator.checkAllHealth();
        const status = orchestrator.getStatus();
        const isHealthy = health.some((h) => h.status === 'healthy');
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'ok' : 'degraded',
            astrology: {
                activeProvider: status.activeProvider,
                healthyProviders: status.healthyProviders,
                totalProviders: status.totalProviders,
            },
        });
    }
    catch (error) {
        res.status(503).json({ status: 'error', astrology: 'unavailable' });
    }
});
// API routes
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/user', user_1.default);
app.use('/api/v1/chat', chat_1.default);
app.use('/api/v1/birth-chart', birthChart_1.default);
app.use('/api/v1/birth-data', birthData_1.default);
app.use('/api/v1/locations', locations_1.default);
app.use('/api/v1/forecasts', forecasts_1.default);
app.use('/api/v1/partners', partners_1.default);
app.use('/api/v1/subscription', subscription_1.default);
app.use('/api/v1/language', language_1.default);
app.use('/api/v1/llm', llm_1.default); // US-34: LLM Provider Fallback
app.use('/api/v1/providers', llm_1.default); // US-34: Canonical providers/status endpoint
app.use('/api/v1/compatibility', compatibility_1.default); // US-20: Compatibility Analysis
app.use('/api/v1/cron', cron_1.default); // US-36: Monthly Reset Cron
app.use('/api/v1/astrology', astrology_1.default); // US-33: Astrology API Fallback
app.use('/api/v1/admin', admin_1.default); // Step 11: Admin Dashboard
// ============================================
// ERROR HANDLING
// ============================================
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});
// Global error handler
app.use((err, req, res, _next) => {
    console.error('[Error]', err.stack);
    // Check for infrastructure-related errors (database, connection, etc.)
    const message = err.message || String(err);
    const isInfraError = /\b(connect|connection|database|prisma|timeout|pool|P1001|P1002|P1017|ECONNREFUSED)\b/i.test(message);
    if (isInfraError) {
        console.error('[Error] Infrastructure error detected:', message);
        res.status(503).json({
            success: false,
            error: {
                code: 'AUTH_SERVICE_UNAVAILABLE',
                message: process.env.NODE_ENV === 'production'
                    ? 'Service temporarily unavailable'
                    : message,
            },
        });
        return;
    }
    // Check for JWT-specific errors
    if (message.includes('JWT_SECRET')) {
        console.error('[Error] JWT configuration error:', message);
        res.status(503).json({
            success: false,
            error: {
                code: 'AUTH_SERVICE_UNAVAILABLE',
                message: process.env.NODE_ENV === 'production'
                    ? 'Service temporarily unavailable'
                    : 'JWT not configured',
            },
        });
        return;
    }
    // Generic error handler
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message,
        },
    });
});
// ============================================
// INITIALIZE SOCKET.IO
// ============================================
const io = (0, socket_1.initializeSocketServer)(httpServer);
exports.io = io;
// Register chat handlers on connection
io.on('connection', (socket) => {
    (0, socket_1.registerChatHandlers)(socket);
});
// ============================================
// START SERVER
// ============================================
httpServer.listen(PORT, () => {
    const envReport = (0, envValidation_1.getEnvValidationReport)();
    console.log(`🚀 AstroLogAI API running on port ${PORT}`);
    console.log(`📚 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Env validation: http://localhost:${PORT}/health/env (${envReport.ok ? 'ok' : 'degraded'})`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`🌐 Allowed origins: ${runtime_1.runtimeConfig.allowedOrigins.join(', ') || '(none configured)'}`);
    if (!envReport.ok) {
        console.warn(`⚠️ Missing required env vars: ${envReport.missingRequired.join(', ')}`);
    }
    // US-30: Start background chart regeneration processor
    (0, chart_regeneration_1.startRegenerationProcessor)();
    console.log(`⚡ Chart regeneration processor started`);
});
exports.default = app;
//# sourceMappingURL=index.js.map