"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keywordAlertsRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.keywordAlertsRouter = (0, express_1.Router)();
function parseBoolean(value) {
    if (value === 'true') {
        return true;
    }
    if (value === 'false') {
        return false;
    }
    return undefined;
}
exports.keywordAlertsRouter.get('/', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId, isActive, tier, category } = req.query;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' &&
            facilityId &&
            String(facilityId) !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only access their facility alerts',
            }));
            return;
        }
        const activeFilter = parseBoolean(isActive);
        const where = {
            agencyId: req.user.agencyId,
            ...(activeFilter !== undefined ? { isActive: activeFilter } : {}),
            ...(tier ? { tier: String(tier) } : {}),
            ...(category ? { category: String(category) } : {}),
        };
        if (facilityId) {
            where.facilityId = String(facilityId);
        }
        else if (req.user.role === 'facility_admin' && req.user.facilityId) {
            where.OR = [{ facilityId: null }, { facilityId: req.user.facilityId }];
        }
        const alerts = await shared_1.prisma.keywordAlert.findMany({
            where,
            include: {
                creator: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json((0, shared_1.createSuccessResponse)(alerts));
    }
    catch (error) {
        console.error('Error fetching keyword alerts:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch keyword alerts',
        }));
    }
});
exports.keywordAlertsRouter.post('/', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { keyword, isRegex = false, severity, tier, category, facilityId } = req.body;
        if (!req.user?.id || !req.user.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin context is invalid',
            }));
            return;
        }
        if (!keyword || !severity || !tier || !category) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'keyword, severity, tier, and category are required',
            }));
            return;
        }
        let effectiveFacilityId = null;
        if (req.user.role === 'facility_admin') {
            if (!req.user.facilityId) {
                res.status(400).json((0, shared_1.createErrorResponse)({
                    code: 'VALIDATION_ERROR',
                    message: 'Facility admin must belong to a facility',
                }));
                return;
            }
            if (facilityId && String(facilityId) !== req.user.facilityId) {
                res.status(403).json((0, shared_1.createErrorResponse)({
                    code: 'FORBIDDEN',
                    message: 'Facility admins can only create alerts for their own facility',
                }));
                return;
            }
            effectiveFacilityId = req.user.facilityId;
        }
        else if (facilityId) {
            effectiveFacilityId = String(facilityId);
        }
        const alert = await shared_1.prisma.keywordAlert.create({
            data: {
                keyword: String(keyword),
                isRegex: Boolean(isRegex),
                severity,
                tier,
                category,
                facilityId: effectiveFacilityId,
                agencyId: req.user.agencyId,
                createdBy: req.user.id,
            },
        });
        res.status(201).json((0, shared_1.createSuccessResponse)(alert));
    }
    catch (error) {
        console.error('Error creating keyword alert:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to create keyword alert',
        }));
    }
});
exports.keywordAlertsRouter.patch('/:id', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { keyword, severity, tier, isActive } = req.body;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const existingAlert = await shared_1.prisma.keywordAlert.findFirst({
            where: {
                id,
                agencyId: req.user.agencyId,
            },
        });
        if (!existingAlert) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Keyword alert not found',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' &&
            existingAlert.facilityId !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only update alerts in their facility',
            }));
            return;
        }
        const updatedAlert = await shared_1.prisma.keywordAlert.update({
            where: { id },
            data: {
                ...(keyword !== undefined ? { keyword: String(keyword) } : {}),
                ...(severity !== undefined ? { severity } : {}),
                ...(tier !== undefined ? { tier } : {}),
                ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
            },
        });
        res.json((0, shared_1.createSuccessResponse)(updatedAlert));
    }
    catch (error) {
        console.error('Error updating keyword alert:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to update keyword alert',
        }));
    }
});
exports.keywordAlertsRouter.delete('/:id', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const existingAlert = await shared_1.prisma.keywordAlert.findFirst({
            where: {
                id,
                agencyId: req.user.agencyId,
            },
        });
        if (!existingAlert) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Keyword alert not found',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' &&
            existingAlert.facilityId !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only delete alerts in their facility',
            }));
            return;
        }
        const deletedAlert = await shared_1.prisma.keywordAlert.update({
            where: { id },
            data: { isActive: false },
        });
        res.json((0, shared_1.createSuccessResponse)(deletedAlert));
    }
    catch (error) {
        console.error('Error deleting keyword alert:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete keyword alert',
        }));
    }
});
exports.keywordAlertsRouter.get('/:id/matches', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const alert = await shared_1.prisma.keywordAlert.findFirst({
            where: {
                id,
                agencyId: req.user.agencyId,
            },
        });
        if (!alert) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Keyword alert not found',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' && alert.facilityId !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only access matches in their facility',
            }));
            return;
        }
        const matches = await shared_1.prisma.flaggedContent.findMany({
            where: { keywordAlertId: id },
            include: {
                assignedAdmin: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json((0, shared_1.createSuccessResponse)(matches));
    }
    catch (error) {
        console.error('Error fetching keyword alert matches:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch keyword alert matches',
        }));
    }
});
exports.default = exports.keywordAlertsRouter;
//# sourceMappingURL=keyword-alerts.routes.js.map