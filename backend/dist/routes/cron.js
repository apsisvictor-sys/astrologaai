"use strict";
/**
 * Cron Routes
 * US-36: Monthly Reset Logic
 *
 * Endpoints for scheduled jobs (can be called by external cron services)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const monthly_reset_1 = require("../services/monthly-reset");
const cron_1 = require("../utils/cron");
const prisma_1 = require("../utils/prisma");
const fs = require("fs");
const path = require("path");
const router = (0, express_1.Router)();
/**
 * POST /api/v1/cron/monthly-reset
 * Run monthly query counter reset
 *
 * This endpoint should be called daily by a cron service.
 * It will only perform the reset on the configured reset day (default: 1st of month)
 *
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/monthly-reset', async (req, res) => {
    try {
        const configuredSecret = (0, cron_1.getCronSecret)();
        if (!configuredSecret) {
            return res.status(503).json({
                success: false,
                error: {
                    code: 'CRON_NOT_CONFIGURED',
                    message: 'Cron secret is not configured on this environment',
                },
            });
        }
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== configuredSecret) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or missing cron secret',
                },
            });
        }
        // Check if today is reset day
        if (!(0, monthly_reset_1.isResetDay)()) {
            return res.json({
                success: true,
                message: 'Not reset day. Skipping.',
                isResetDay: false,
            });
        }
        // Run the reset
        const result = await (0, monthly_reset_1.resetMonthlyQueryCounters)();
        return res.json({
            success: result.success,
            message: result.success
                ? `Reset completed. ${result.usersProcessed} users processed.`
                : 'Reset failed',
            details: {
                usersProcessed: result.usersProcessed,
                duration: result.duration,
                errorCount: result.errors.length,
                errors: result.errors.slice(0, 5), // First 5 errors only
            },
        });
    }
    catch (error) {
        console.error('[Cron] Monthly reset error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to run monthly reset',
            },
        });
    }
});
/**
 * POST /api/v1/cron/archive-old-records
 * Archive old usage records (cleanup)
 *
 * Security: Requires CRON_SECRET header for authentication
 */
router.post('/archive-old-records', async (req, res) => {
    try {
        const configuredSecret = (0, cron_1.getCronSecret)();
        if (!configuredSecret) {
            return res.status(503).json({
                success: false,
                error: {
                    code: 'CRON_NOT_CONFIGURED',
                    message: 'Cron secret is not configured on this environment',
                },
            });
        }
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== configuredSecret) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or missing cron secret',
                },
            });
        }
        // Run archive
        const result = await (0, monthly_reset_1.archiveOldUsageRecords)(12);
        return res.json({
            success: result.success,
            message: `Archived ${result.recordsDeleted} old records`,
            details: {
                recordsDeleted: result.recordsDeleted,
                errorCount: result.errors.length,
            },
        });
    }
    catch (error) {
        console.error('[Cron] Archive error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to archive old records',
            },
        });
    }
});
/**
 * GET /api/v1/cron/status
 * Check cron job status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            isResetDay: (0, monthly_reset_1.isResetDay)(),
            resetDay: parseInt(process.env.FREE_TIER_RESET_DAY || '1'),
            timezone: 'UTC',
        },
    });
});
/**
 * POST /api/v1/cron/run-migration
 * One-time DB schema migration. REMOVE after confirmed successful.
 * Security: Requires CRON_SECRET header.
 */
router.post('/run-migration', async (req, res) => {
    try {
        const configuredSecret = (0, cron_1.getCronSecret)();
        if (!configuredSecret) {
            return res.status(503).json({ success: false, error: { code: 'CRON_NOT_CONFIGURED' } });
        }
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== configuredSecret) {
            return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
        }
        const sqlPath = path.join(process.cwd(), 'supabase_fix.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        const statements = sqlContent
            .split(';')
            .map(s => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').trim())
            .filter(s => s.length > 0);
        const errors = [];
        for (let i = 0; i < statements.length; i++) {
            try {
                await prisma_1.prisma.$executeRawUnsafe(statements[i]);
            }
            catch (err) {
                errors.push({ index: i, error: err.message });
            }
        }
        return res.json({
            success: errors.length === 0,
            data: { total: statements.length, succeeded: statements.length - errors.length, failed: errors.length, errors },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: { message: error.message } });
    }
});
exports.default = router;
//# sourceMappingURL=cron.js.map