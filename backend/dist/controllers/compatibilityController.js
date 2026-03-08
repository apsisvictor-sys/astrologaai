"use strict";
/**
 * Compatibility Controller
 * US-20: Compatibility Analysis
 *
 * Handles compatibility analysis requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateCompatibilityCache = exports.getCompatibilityAnalysis = void 0;
const compatibility_1 = require("../services/compatibility");
/**
 * GET /api/v1/compatibility/:partnerId
 * Get compatibility analysis for a partner
 */
const getCompatibilityAnalysis = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { partnerId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        if (!partnerId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Partner ID is required',
                },
            });
        }
        // Calculate or retrieve cached compatibility
        const analysis = await (0, compatibility_1.calculateCompatibility)(userId, partnerId);
        res.json({
            success: true,
            data: {
                compatibility: analysis,
            },
        });
    }
    catch (error) {
        console.error('Get compatibility error:', error);
        // Handle specific errors
        if (error instanceof Error) {
            if (error.message === 'User birth chart not found') {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'BIRTH_CHART_REQUIRED',
                        message: 'Please complete your birth data before viewing compatibility',
                    },
                });
            }
            if (error.message === 'Partner not found') {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'PARTNER_NOT_FOUND',
                        message: 'Partner not found',
                    },
                });
            }
        }
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to calculate compatibility',
            },
        });
    }
};
exports.getCompatibilityAnalysis = getCompatibilityAnalysis;
/**
 * DELETE /api/v1/compatibility/:partnerId/cache
 * Invalidate cached compatibility analysis
 */
const invalidateCompatibilityCache = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { partnerId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        await (0, compatibility_1.invalidateCompatibilityCache)(userId, partnerId);
        res.json({
            success: true,
            data: {
                message: 'Compatibility cache invalidated',
            },
        });
    }
    catch (error) {
        console.error('Invalidate cache error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to invalidate cache',
            },
        });
    }
};
exports.invalidateCompatibilityCache = invalidateCompatibilityCache;
//# sourceMappingURL=compatibilityController.js.map