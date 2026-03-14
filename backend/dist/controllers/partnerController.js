"use strict";
/**
 * Partner Controller
 * US-18: Add Partner - CRUD operations for partner management
 * US-19: Synastry Chart Generation
 * US-20: Compatibility Report
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompatibilityReport = exports.getSynastry = exports.deletePartner = exports.updatePartner = exports.createPartner = exports.getPartner = exports.listPartners = void 0;
const prisma_1 = require("../utils/prisma");
const client_1 = require("@prisma/client");
const synastry_service_1 = require("../services/synastry.service");
const compatibility_report_service_1 = require("../services/compatibility-report.service");
// Validation helpers
const validateBirthData = (data) => {
    const errors = [];
    if (!data.birthDate) {
        errors.push('Birth date is required');
    }
    else if (new Date(data.birthDate) > new Date()) {
        errors.push('Birth date cannot be in the future');
    }
    if (!data.locationName) {
        errors.push('Birth location is required');
    }
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        errors.push('Valid coordinates are required');
    }
    if (!data.timezone) {
        errors.push('Timezone is required');
    }
    // Validate birth time format if provided
    if (data.birthTime && !data.isUnknownTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(data.birthTime)) {
            errors.push('Birth time must be in HH:MM format');
        }
    }
    return errors;
};
const isValidRelationshipType = (type) => {
    return Object.values(client_1.RelationshipType).includes(type);
};
/**
 * GET /api/partners
 * List all partners for the authenticated user
 */
const listPartners = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        const partners = await prisma_1.prisma.partner.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                label: true,
                relationshipType: true,
                birthDate: true,
                birthTime: true,
                locationName: true,
                chartSummary: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        // Format response
        const formattedPartners = partners.map(partner => ({
            id: partner.id,
            name: partner.name,
            label: partner.label,
            relationshipType: partner.relationshipType.toLowerCase(),
            birthData: {
                date: partner.birthDate.toISOString().split('T')[0],
                time: partner.birthTime,
                location: partner.locationName,
                isUnknownTime: !partner.birthTime,
            },
            chartSummary: partner.chartSummary,
            notes: partner.notes,
            createdAt: partner.createdAt,
            updatedAt: partner.updatedAt,
        }));
        res.json({
            success: true,
            data: {
                partners: formattedPartners,
            },
        });
    }
    catch (error) {
        console.error('List partners error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to retrieve partners',
            },
        });
    }
};
exports.listPartners = listPartners;
/**
 * GET /api/partners/:id
 * Get a specific partner's details
 */
const getPartner = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        const partner = await prisma_1.prisma.partner.findFirst({
            where: {
                id,
                userId, // Ensure user owns this partner record
            },
        });
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Partner not found',
                },
            });
        }
        res.json({
            success: true,
            data: {
                partner: {
                    id: partner.id,
                    name: partner.name,
                    label: partner.label,
                    relationshipType: partner.relationshipType.toLowerCase(),
                    birthData: {
                        date: partner.birthDate.toISOString().split('T')[0],
                        time: partner.birthTime,
                        location: partner.locationName,
                        latitude: partner.latitude,
                        longitude: partner.longitude,
                        timezone: partner.timezone,
                        isUnknownTime: partner.isUnknownTime,
                    },
                    chartSummary: partner.chartSummary,
                    notes: partner.notes,
                    createdAt: partner.createdAt,
                    updatedAt: partner.updatedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Get partner error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to retrieve partner',
            },
        });
    }
};
exports.getPartner = getPartner;
/**
 * POST /api/partners
 * Add a new partner
 */
const createPartner = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        const { name, label, relationshipType = 'romantic', birthDate, birthTime, locationName, latitude, longitude, timezone, isUnknownTime = false, notes, } = req.body;
        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Partner name is required',
                    details: [{ field: 'name', message: 'Name cannot be empty' }],
                },
            });
        }
        // Validate relationship type
        const normalizedType = relationshipType.toUpperCase();
        if (!isValidRelationshipType(normalizedType)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid relationship type',
                    details: [{
                            field: 'relationshipType',
                            message: `Must be one of: ${Object.values(client_1.RelationshipType).join(', ').toLowerCase()}`,
                        }],
                },
            });
        }
        // Validate birth data
        const birthDataValidation = validateBirthData({
            birthDate,
            birthTime,
            locationName,
            latitude,
            longitude,
            timezone,
            isUnknownTime,
        });
        if (birthDataValidation.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid birth data',
                    details: birthDataValidation.map(msg => ({ message: msg })),
                },
            });
        }
        // Check partner limit (Free: 1, Pro: 10, Premium: unlimited)
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: { select: { partners: true } },
            },
        });
        const partnerLimits = {
            FREE: 0,
            PRO: 0,
            PREMIUM: 10,
        };
        const limit = partnerLimits[user?.tier || 'FREE'];
        const currentCount = user?._count.partners || 0;
        if (currentCount >= limit) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'LIMIT_EXCEEDED',
                    message: `Partner limit reached for your tier (${limit} partners)`,
                    upgradeRequired: user?.tier !== 'PREMIUM',
                },
            });
        }
        // Create partner
        const partner = await prisma_1.prisma.partner.create({
            data: {
                userId,
                name: name.trim(),
                label: label?.trim() || null,
                relationshipType: normalizedType,
                birthDate: new Date(birthDate),
                birthTime: isUnknownTime ? null : birthTime,
                locationName,
                latitude,
                longitude,
                timezone,
                isUnknownTime,
                notes: notes?.trim() || null,
            },
        });
        res.status(201).json({
            success: true,
            data: {
                partner: {
                    id: partner.id,
                    name: partner.name,
                    label: partner.label,
                    relationshipType: partner.relationshipType.toLowerCase(),
                    birthData: {
                        date: partner.birthDate.toISOString().split('T')[0],
                        time: partner.birthTime,
                        location: partner.locationName,
                        isUnknownTime: partner.isUnknownTime,
                    },
                    notes: partner.notes,
                    createdAt: partner.createdAt,
                },
                message: 'Partner added successfully',
            },
        });
    }
    catch (error) {
        console.error('Create partner error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to create partner',
            },
        });
    }
};
exports.createPartner = createPartner;
/**
 * PUT /api/partners/:id
 * Update a partner's information
 */
const updatePartner = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        // Check partner exists and belongs to user
        const existingPartner = await prisma_1.prisma.partner.findFirst({
            where: { id, userId },
        });
        if (!existingPartner) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Partner not found',
                },
            });
        }
        const { name, label, relationshipType, birthDate, birthTime, locationName, latitude, longitude, timezone, isUnknownTime, notes, } = req.body;
        // Build update data
        const updateData = {};
        // Update name if provided
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Partner name cannot be empty',
                    },
                });
            }
            updateData.name = name.trim();
        }
        // Update label if provided
        if (label !== undefined) {
            updateData.label = label?.trim() || null;
        }
        // Update relationship type if provided
        if (relationshipType !== undefined) {
            const normalizedType = relationshipType.toUpperCase();
            if (!isValidRelationshipType(normalizedType)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid relationship type',
                    },
                });
            }
            updateData.relationshipType = normalizedType;
        }
        // Update notes if provided
        if (notes !== undefined) {
            updateData.notes = notes?.trim() || null;
        }
        // Update birth data if any birth field is provided
        if (birthDate !== undefined || birthTime !== undefined || locationName !== undefined) {
            const newBirthData = {
                birthDate: birthDate !== undefined ? new Date(birthDate) : existingPartner.birthDate,
                birthTime: birthTime !== undefined ? (isUnknownTime ? null : birthTime) : existingPartner.birthTime,
                locationName: locationName !== undefined ? locationName : existingPartner.locationName,
                latitude: latitude !== undefined ? latitude : existingPartner.latitude,
                longitude: longitude !== undefined ? longitude : existingPartner.longitude,
                timezone: timezone !== undefined ? timezone : existingPartner.timezone,
                isUnknownTime: isUnknownTime !== undefined ? isUnknownTime : existingPartner.isUnknownTime,
            };
            const birthDataValidation = validateBirthData(newBirthData);
            if (birthDataValidation.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid birth data',
                        details: birthDataValidation.map(msg => ({ message: msg })),
                    },
                });
            }
            updateData.birthDate = newBirthData.birthDate;
            updateData.birthTime = newBirthData.birthTime;
            updateData.locationName = newBirthData.locationName;
            updateData.latitude = newBirthData.latitude;
            updateData.longitude = newBirthData.longitude;
            updateData.timezone = newBirthData.timezone;
            updateData.isUnknownTime = newBirthData.isUnknownTime;
            // Clear cached chart summary if birth data changed
            updateData.chartSummary = null;
        }
        // Perform update
        const updatedPartner = await prisma_1.prisma.partner.update({
            where: { id },
            data: updateData,
        });
        res.json({
            success: true,
            data: {
                partner: {
                    id: updatedPartner.id,
                    name: updatedPartner.name,
                    label: updatedPartner.label,
                    relationshipType: updatedPartner.relationshipType.toLowerCase(),
                    birthData: {
                        date: updatedPartner.birthDate.toISOString().split('T')[0],
                        time: updatedPartner.birthTime,
                        location: updatedPartner.locationName,
                        isUnknownTime: updatedPartner.isUnknownTime,
                    },
                    notes: updatedPartner.notes,
                    updatedAt: updatedPartner.updatedAt,
                },
                message: 'Partner updated successfully',
            },
        });
    }
    catch (error) {
        console.error('Update partner error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to update partner',
            },
        });
    }
};
exports.updatePartner = updatePartner;
/**
 * DELETE /api/partners/:id
 * Remove a partner
 */
const deletePartner = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        // Check partner exists and belongs to user
        const partner = await prisma_1.prisma.partner.findFirst({
            where: { id, userId },
        });
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Partner not found',
                },
            });
        }
        // Delete partner
        await prisma_1.prisma.partner.delete({
            where: { id },
        });
        res.json({
            success: true,
            data: {
                message: 'Partner removed successfully',
            },
        });
    }
    catch (error) {
        console.error('Delete partner error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to delete partner',
            },
        });
    }
};
exports.deletePartner = deletePartner;
/**
 * GET /api/partners/:id/synastry
 * US-19: Get synastry chart between user and partner
 */
const getSynastry = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id: partnerId } = req.params;
        const language = req.query.language || 'bg';
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        // Get user's birth data
        const userBirthData = await prisma_1.prisma.birthData.findUnique({
            where: { userId },
        });
        if (!userBirthData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BIRTH_DATA_REQUIRED',
                    message: 'You need to enter your birth data first to calculate synastry',
                },
            });
        }
        // Get partner
        const partner = await prisma_1.prisma.partner.findFirst({
            where: { id: partnerId, userId },
        });
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Partner not found',
                },
            });
        }
        // Try to get cached synastry first
        const cachedSynastry = await (0, synastry_service_1.getCachedSynastry)(userId, partnerId);
        if (cachedSynastry) {
            return res.json({
                success: true,
                data: {
                    synastry: cachedSynastry,
                    partner: {
                        id: partner.id,
                        name: partner.name,
                        label: partner.label,
                        relationshipType: partner.relationshipType.toLowerCase(),
                    },
                    language,
                    cached: true,
                },
            });
        }
        // Parse user birth data
        const userBirthDate = new Date(userBirthData.date);
        const [userHour = 12, userMinute = 0] = (userBirthData.time || '12:00').split(':').map(Number);
        // Parse partner birth data
        const partnerBirthDate = new Date(partner.birthDate);
        const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || '12:00').split(':').map(Number);
        // Calculate synastry chart
        const synastryChart = await (0, synastry_service_1.calculateSynastryChart)({
            year: userBirthDate.getFullYear(),
            month: userBirthDate.getMonth() + 1,
            day: userBirthDate.getDate(),
            hour: userHour,
            minute: userMinute,
            latitude: userBirthData.latitude,
            longitude: userBirthData.longitude,
            timezone: userBirthData.timezone,
        }, {
            year: partnerBirthDate.getFullYear(),
            month: partnerBirthDate.getMonth() + 1,
            day: partnerBirthDate.getDate(),
            hour: partnerHour,
            minute: partnerMinute,
            latitude: partner.latitude,
            longitude: partner.longitude,
            timezone: partner.timezone,
        }, userId, partnerId);
        // Update partner with chart summary if not present
        if (!partner.chartSummary) {
            await prisma_1.prisma.partner.update({
                where: { id: partnerId },
                data: {
                    chartSummary: {
                        sunSign: synastryChart.partnerChart.sun.sign,
                        moonSign: synastryChart.partnerChart.moon.sign,
                        risingSign: synastryChart.partnerChart.rising?.sign,
                    },
                },
            });
        }
        res.json({
            success: true,
            data: {
                synastry: synastryChart,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    label: partner.label,
                    relationshipType: partner.relationshipType.toLowerCase(),
                },
                language,
                cached: false,
            },
        });
    }
    catch (error) {
        console.error('Get synastry error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to calculate synastry chart',
            },
        });
    }
};
exports.getSynastry = getSynastry;
/**
 * GET /api/partners/:id/report
 * US-20: Get detailed compatibility report
 */
const getCompatibilityReport = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id: partnerId } = req.params;
        const language = req.query.language || 'bg';
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                },
            });
        }
        // Get user's birth data
        const userBirthData = await prisma_1.prisma.birthData.findUnique({
            where: { userId },
        });
        if (!userBirthData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BIRTH_DATA_REQUIRED',
                    message: 'You need to enter your birth data first to generate a compatibility report',
                },
            });
        }
        // Get partner
        const partner = await prisma_1.prisma.partner.findFirst({
            where: { id: partnerId, userId },
        });
        if (!partner) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Partner not found',
                },
            });
        }
        // Try to get cached report first
        const cachedReport = await (0, compatibility_report_service_1.getCachedReport)(userId, partnerId, language);
        if (cachedReport) {
            return res.json({
                success: true,
                data: {
                    report: cachedReport,
                    partner: {
                        id: partner.id,
                        name: partner.name,
                        label: partner.label,
                        relationshipType: partner.relationshipType.toLowerCase(),
                    },
                    cached: true,
                },
            });
        }
        // Parse user birth data
        const userBirthDate = new Date(userBirthData.date);
        const [userHour = 12, userMinute = 0] = (userBirthData.time || '12:00').split(':').map(Number);
        // Parse partner birth data
        const partnerBirthDate = new Date(partner.birthDate);
        const [partnerHour = 12, partnerMinute = 0] = (partner.birthTime || '12:00').split(':').map(Number);
        // Generate compatibility report
        const report = await (0, compatibility_report_service_1.generateCompatibilityReport)({
            year: userBirthDate.getFullYear(),
            month: userBirthDate.getMonth() + 1,
            day: userBirthDate.getDate(),
            hour: userHour,
            minute: userMinute,
            latitude: userBirthData.latitude,
            longitude: userBirthData.longitude,
            timezone: userBirthData.timezone,
        }, {
            year: partnerBirthDate.getFullYear(),
            month: partnerBirthDate.getMonth() + 1,
            day: partnerBirthDate.getDate(),
            hour: partnerHour,
            minute: partnerMinute,
            latitude: partner.latitude,
            longitude: partner.longitude,
            timezone: partner.timezone,
        }, partnerId, partner.name, userId, language);
        // Update partner with chart summary if not present (using synastry data for signs)
        if (!partner.chartSummary) {
            try {
                // Get synastry chart to extract sign info
                const synastryResult = await Promise.resolve().then(() => __importStar(require('../services/synastry.service'))).then(m => m.calculateSynastryChart({
                    year: userBirthDate.getFullYear(),
                    month: userBirthDate.getMonth() + 1,
                    day: userBirthDate.getDate(),
                    hour: userHour,
                    minute: userMinute,
                    latitude: userBirthData.latitude,
                    longitude: userBirthData.longitude,
                    timezone: userBirthData.timezone,
                }, {
                    year: partnerBirthDate.getFullYear(),
                    month: partnerBirthDate.getMonth() + 1,
                    day: partnerBirthDate.getDate(),
                    hour: partnerHour,
                    minute: partnerMinute,
                    latitude: partner.latitude,
                    longitude: partner.longitude,
                    timezone: partner.timezone,
                }, userId, partnerId));
                const chartSummary = {
                    sunSign: synastryResult.partnerChart?.sun?.sign || '',
                    moonSign: synastryResult.partnerChart?.moon?.sign || '',
                    risingSign: synastryResult.partnerChart?.rising?.sign || '',
                };
                // Only update if we have valid data
                if (chartSummary.sunSign || chartSummary.moonSign || chartSummary.risingSign) {
                    await prisma_1.prisma.partner.update({
                        where: { id: partnerId },
                        data: { chartSummary },
                    });
                }
            }
            catch (summaryError) {
                // Non-critical error - don't fail the request
                console.warn('Failed to update partner chart summary:', summaryError);
            }
        }
        res.json({
            success: true,
            data: {
                report,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    label: partner.label,
                    relationshipType: partner.relationshipType.toLowerCase(),
                },
                cached: false,
            },
        });
    }
    catch (error) {
        console.error('Get compatibility report error:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to generate compatibility report',
            },
        });
    }
};
exports.getCompatibilityReport = getCompatibilityReport;
//# sourceMappingURL=partnerController.js.map