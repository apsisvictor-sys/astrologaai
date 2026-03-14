/**
 * AstroLogAI Backend API Server
 * Main entry point — v2026-03-14
 *
 * US-10: WebSocket support via Socket.io
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { createServer } from 'http';
import { runtimeConfig, isOriginAllowed } from './config/runtime';
import { getEnvValidationReport } from './config/envValidation';
import { prisma } from './utils/prisma';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import chatRoutes from './routes/chat';
import birthChartRoutes from './routes/birthChart';
import birthDataRoutes from './routes/birthData';
import locationsRoutes from './routes/locations';
import forecastRoutes from './routes/forecasts';
import partnersRoutes from './routes/partners';
import subscriptionRoutes from './routes/subscription';
import languageRoutes from './routes/language';
import llmRoutes from './routes/llm'; // US-34: LLM Provider Fallback
import compatibilityRoutes from './routes/compatibility'; // US-20: Compatibility Analysis
import cronRoutes from './routes/cron'; // US-36: Monthly Reset Cron
import astrologyRoutes from './routes/astrology'; // US-33: Astrology API Fallback
import adminRoutes from './routes/admin'; // Step 11: Admin Dashboard
import guestChatRoutes from './routes/guestChat';

// US-37: Rate limit headers middleware
import { rateLimitHeadersMiddleware, fetchRateLimitStatus } from './middleware/rateLimitHeaders';

// Import Socket.io
import { initializeSocketServer, registerChatHandlers } from './socket';
import type { AuthenticatedSocket } from './socket';

// US-30: Chart regeneration processor
import { startRegenerationProcessor } from './services/chart-regeneration';
import { seedAdminDefaults } from './services/admin-defaults';
import { ensureDailyForecastTable, startForecastCron } from './services/forecast-cron';

config({ override: true });

const app: Express = express();
const PORT = runtimeConfig.port;

// Trust Railway's proxy (required for express-rate-limit to work correctly behind Railway)
app.set('trust proxy', 1);

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowed = isOriginAllowed(origin);

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// US-37: Add rate limit headers to all responses
app.use(rateLimitHeadersMiddleware);
// US-37: Fetch rate limit status for authenticated requests
app.use(fetchRateLimitStatus);

// ============================================
// ROUTES
// ============================================

// GET /r/:slug — Referral click tracking redirect
app.get('/r/:slug', async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    await prisma.referralLink.update({
      where: { slug, isActive: true },
      data: { clicks: { increment: 1 } },
    });
  } catch (_err) {
    console.warn('[Referral] Click increment failed for slug:', slug, _err);
  }
  const frontendUrl = process.env.FRONTEND_URL || 'https://astrologa.bg';
  res.redirect(302, `${frontendUrl}?ref=${encodeURIComponent(slug)}`);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    websocket: 'enabled',
  });
});

app.get('/health/env', (_req: Request, res: Response) => {
  const report = getEnvValidationReport();
  res.status(report.ok ? 200 : 503).json({
    status: report.ok ? 'ok' : 'degraded',
    env: report,
  });
});

// Health check for database
app.get('/health/db', async (req: Request, res: Response) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Health check for Redis
app.get('/health/redis', async (req: Request, res: Response) => {
  try {
    const { redisClient } = await import('./utils/redis');
    await redisClient.ping();
    res.json({ status: 'ok', redis: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', redis: 'disconnected' });
  }
});

// Health check for Astrology API (US-33)
app.get('/health/astrology', async (req: Request, res: Response) => {
  try {
    const { getAstrologyOrchestrator } = await import('./services/astrology/astrology-orchestrator');
    const orchestrator = getAstrologyOrchestrator();
    const health = await orchestrator.checkAllHealth();
    const status = orchestrator.getStatus();
    
    const isHealthy = health.some((h: { status: string }) => h.status === 'healthy');
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      astrology: {
        activeProvider: status.activeProvider,
        healthyProviders: status.healthyProviders,
        totalProviders: status.totalProviders,
      },
    });
  } catch (error) {
    res.status(503).json({ status: 'error', astrology: 'unavailable' });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/chat/guest', guestChatRoutes); // Guest (unauthenticated) chat — must be before /api/v1/chat
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/birth-chart', birthChartRoutes);
app.use('/api/v1/birth-data', birthDataRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/forecasts', forecastRoutes);
app.use('/api/v1/partners', partnersRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/language', languageRoutes);
app.use('/api/v1/llm', llmRoutes); // US-34: LLM Provider Fallback
app.use('/api/v1/providers', llmRoutes); // US-34: Canonical providers/status endpoint
app.use('/api/v1/compatibility', compatibilityRoutes); // US-20: Compatibility Analysis
app.use('/api/v1/cron', cronRoutes); // US-36: Monthly Reset Cron
app.use('/api/v1/astrology', astrologyRoutes); // US-33: Astrology API Fallback
app.use('/api/v1/admin', adminRoutes); // Step 11: Admin Dashboard

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
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

const io = initializeSocketServer(httpServer);

// Register chat handlers on connection
io.on('connection', (socket: AuthenticatedSocket) => {
  registerChatHandlers(socket);
});

// ============================================
// START SERVER
// ============================================

httpServer.listen(PORT, () => {
  const envReport = getEnvValidationReport();

  console.log(`🚀 AstroLogAI API running on port ${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Env validation: http://localhost:${PORT}/health/env (${envReport.ok ? 'ok' : 'degraded'})`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/v1/auth`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`🌐 Allowed origins: ${runtimeConfig.allowedOrigins.join(', ') || '(none configured)'}`);
  if (!envReport.ok) {
    console.warn(`⚠️ Missing required env vars: ${envReport.missingRequired.join(', ')}`);
  }

  // US-30: Start background chart regeneration processor
  startRegenerationProcessor();
  console.log(`⚡ Chart regeneration processor started`);

  // Nightly forecast pre-generation: create table then start scheduler
  ensureDailyForecastTable().then(() => {
    startForecastCron();
    console.log(`⚡ Nightly forecast cron started (runs daily at 02:00 UTC)`);
  }).catch(err => console.error('[Startup] Failed to start forecast cron:', err));

  // Seed AdminConfig defaults (model prices, alert thresholds) — skips if already set
  seedAdminDefaults().catch(err => console.error('[Startup] Failed to seed admin defaults:', err));
});

export default app;
export { httpServer, io };
