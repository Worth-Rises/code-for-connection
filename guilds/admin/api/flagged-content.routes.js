"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flaggedContentRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.flaggedContentRouter = (0, express_1.Router)();
exports.flaggedContentRouter.get('/', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { status, severity, contentType } = req.query;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const where = {
            ...(status ? { status: String(status) } : {}),
            ...(severity ? { severity: String(severity) } : {}),
            ...(contentType ? { contentType: String(contentType) } : {}),
        };
        if (req.user.role === 'facility_admin' && req.user.facilityId) {
            where.OR = [
                { keywordAlertId: null },
                {
                    keywordAlert: {
                        agencyId: req.user.agencyId,
                        OR: [{ facilityId: null }, { facilityId: req.user.facilityId }],
                    },
                },
            ];
        }
        else {
            where.OR = [
                { keywordAlertId: null },
                { keywordAlert: { agencyId: req.user.agencyId } },
            ];
        }
        const flaggedContent = await shared_1.prisma.flaggedContent.findMany({
            where,
            include: {
                keywordAlert: true,
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
        res.json((0, shared_1.createSuccessResponse)(flaggedContent));
    }
    catch (error) {
        console.error('Error fetching flagged content:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch flagged content',
        }));
    }
});
exports.flaggedContentRouter.patch('/:id/review', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionNotes } = req.body;
        if (!req.user?.id || !req.user.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin context is invalid',
            }));
            return;
        }
        if (!status) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'status is required',
            }));
            return;
        }
        const existing = await shared_1.prisma.flaggedContent.findFirst({
            where: {
                id,
                OR: [
                    { keywordAlertId: null },
                    { keywordAlert: { agencyId: req.user.agencyId } },
                ],
            },
            include: {
                keywordAlert: true,
            },
        });
        if (!existing) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Flagged content not found',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' &&
            existing.keywordAlert?.facilityId &&
            existing.keywordAlert.facilityId !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only review content from their facility',
            }));
            return;
        }
        const reviewed = await shared_1.prisma.flaggedContent.update({
            where: { id },
            data: {
                status,
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                ...(resolutionNotes !== undefined ? { resolutionNotes: String(resolutionNotes) } : {}),
            },
        });
        res.json((0, shared_1.createSuccessResponse)(reviewed));
    }
    catch (error) {
        console.error('Error reviewing flagged content:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to review flagged content',
        }));
    }
});
exports.flaggedContentRouter.post('/:id/escalate', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo, notes } = req.body;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        if (!assignedTo) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'assignedTo is required',
            }));
            return;
        }
        const assignee = await shared_1.prisma.adminUser.findFirst({
            where: {
                id: String(assignedTo),
                agencyId: req.user.agencyId,
            },
        });
        if (!assignee) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Assignee admin not found',
            }));
            return;
        }
        const current = await shared_1.prisma.flaggedContent.findFirst({
            where: {
                id,
                OR: [
                    { keywordAlertId: null },
                    { keywordAlert: { agencyId: req.user.agencyId } },
                ],
            },
            include: {
                keywordAlert: true,
            },
        });
        if (!current) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Flagged content not found',
            }));
            return;
        }
        if (req.user.role === 'facility_admin' &&
            current.keywordAlert?.facilityId &&
            current.keywordAlert.facilityId !== req.user.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Facility admins can only escalate content from their facility',
            }));
            return;
        }
        const appendedNotes = notes
            ? current.resolutionNotes
                ? `${current.resolutionNotes}\n${String(notes)}`
                : String(notes)
            : current.resolutionNotes;
        const escalated = await shared_1.prisma.flaggedContent.update({
            where: { id },
            data: {
                assignedTo: String(assignedTo),
                status: 'escalated',
                resolutionNotes: appendedNotes,
            },
        });
        res.json((0, shared_1.createSuccessResponse)(escalated));
    }
    catch (error) {
        console.error('Error escalating flagged content:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to escalate flagged content',
        }));
    }
});
exports.flaggedContentRouter.post('/', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { contentType, contentId, flagReason, severity, notes } = req.body;
        if (!contentType || !contentId || !severity) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'contentType, contentId, and severity are required',
            }));
            return;
        }
        const flagged = await shared_1.prisma.flaggedContent.create({
            data: {
                contentType,
                contentId: String(contentId),
                flagReason: flagReason ?? 'manual',
                severity,
                resolutionNotes: notes ? String(notes) : null,
            },
        });
        res.status(201).json((0, shared_1.createSuccessResponse)(flagged));
    }
    catch (error) {
        console.error('Error creating manual flag:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to create manual flag',
        }));
    }
});
exports.default = exports.flaggedContentRouter;
//# sourceMappingURL=flagged-content.routes.js.map