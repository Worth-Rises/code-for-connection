"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.messagingRouter = (0, express_1.Router)();
exports.messagingRouter.get('/logs', shared_1.requireAuth, async (req, res) => {
    try {
        const { facilityId, startDate, endDate, userId, page = '1', pageSize = '20' } = req.query;
        const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
        const take = parseInt(String(pageSize));
        const messages = await shared_1.prisma.message.findMany({
            where: {},
            include: {
                conversation: {
                    include: {
                        incarceratedPerson: true,
                        familyMember: true,
                    },
                },
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
        const total = await shared_1.prisma.message.count();
        res.json({
            success: true,
            data: messages,
            pagination: {
                page: parseInt(String(page)),
                pageSize: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        });
    }
    catch (error) {
        console.error('Error fetching message logs:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch message logs',
        }));
    }
});
exports.messagingRouter.get('/pending', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId } = req.query;
        const pendingMessages = await shared_1.prisma.message.findMany({
            where: {
                status: 'pending_review',
            },
            include: {
                conversation: {
                    include: {
                        incarceratedPerson: true,
                        familyMember: true,
                    },
                },
                attachments: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        res.json((0, shared_1.createSuccessResponse)(pendingMessages));
    }
    catch (error) {
        console.error('Error fetching pending messages:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch pending messages',
        }));
    }
});
exports.messagingRouter.post('/approve/:messageId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await shared_1.prisma.message.update({
            where: { id: messageId },
            data: {
                status: 'approved',
                reviewedBy: req.user.id,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, message }));
    }
    catch (error) {
        console.error('Error approving message:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to approve message',
        }));
    }
});
exports.messagingRouter.post('/block-conversation/:conversationId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversation = await shared_1.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                isBlocked: true,
                blockedBy: req.user.id,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, conversation }));
    }
    catch (error) {
        console.error('Error blocking conversation:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to block conversation',
        }));
    }
});
exports.messagingRouter.get('/stats', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId, date } = req.query;
        const targetDate = date ? new Date(String(date)) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const [todayTotal, pendingReview] = await Promise.all([
            shared_1.prisma.message.count({
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                },
            }),
            shared_1.prisma.message.count({
                where: { status: 'pending_review' },
            }),
        ]);
        res.json((0, shared_1.createSuccessResponse)({ todayTotal, pendingReview }));
    }
    catch (error) {
        console.error('Error fetching messaging stats:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch stats',
        }));
    }
});
exports.default = exports.messagingRouter;
//# sourceMappingURL=routes.js.map