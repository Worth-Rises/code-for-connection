"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.videoRouter = (0, express_1.Router)();
exports.videoRouter.get('/active-calls', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId } = req.query;
        const activeCalls = await shared_1.prisma.videoCall.findMany({
            where: {
                status: 'in_progress',
                ...(facilityId ? { facilityId: String(facilityId) } : {}),
            },
            include: {
                incarceratedPerson: true,
                familyMember: true,
            },
            orderBy: { actualStart: 'desc' },
        });
        res.json((0, shared_1.createSuccessResponse)(activeCalls));
    }
    catch (error) {
        console.error('Error fetching active video calls:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch active calls',
        }));
    }
});
exports.videoRouter.get('/call-logs', shared_1.requireAuth, async (req, res) => {
    try {
        const { facilityId, startDate, endDate, userId, page = '1', pageSize = '20' } = req.query;
        const skip = (parseInt(String(page)) - 1) * parseInt(String(pageSize));
        const take = parseInt(String(pageSize));
        const where = {};
        if (facilityId)
            where.facilityId = String(facilityId);
        if (userId) {
            where.OR = [
                { incarceratedPersonId: String(userId) },
                { familyMemberId: String(userId) },
            ];
        }
        if (startDate || endDate) {
            where.scheduledStart = {
                ...(startDate ? { gte: new Date(String(startDate)) } : {}),
                ...(endDate ? { lte: new Date(String(endDate)) } : {}),
            };
        }
        const [calls, total] = await Promise.all([
            shared_1.prisma.videoCall.findMany({
                where,
                include: {
                    incarceratedPerson: true,
                    familyMember: true,
                },
                skip,
                take,
                orderBy: { scheduledStart: 'desc' },
            }),
            shared_1.prisma.videoCall.count({ where }),
        ]);
        res.json({
            success: true,
            data: calls,
            pagination: {
                page: parseInt(String(page)),
                pageSize: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        });
    }
    catch (error) {
        console.error('Error fetching video call logs:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch call logs',
        }));
    }
});
exports.videoRouter.get('/pending-requests', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId } = req.query;
        const pendingRequests = await shared_1.prisma.videoCall.findMany({
            where: {
                status: 'requested',
                ...(facilityId ? { facilityId: String(facilityId) } : {}),
            },
            include: {
                incarceratedPerson: true,
                familyMember: true,
            },
            orderBy: { scheduledStart: 'asc' },
        });
        res.json((0, shared_1.createSuccessResponse)(pendingRequests));
    }
    catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch pending requests',
        }));
    }
});
exports.videoRouter.post('/approve-request/:callId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { callId } = req.params;
        const call = await shared_1.prisma.videoCall.update({
            where: { id: callId },
            data: {
                status: 'scheduled',
                approvedBy: req.user.id,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, call }));
    }
    catch (error) {
        console.error('Error approving video call:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to approve video call',
        }));
    }
});
exports.videoRouter.post('/terminate-call/:callId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { callId } = req.params;
        const call = await shared_1.prisma.videoCall.update({
            where: { id: callId },
            data: {
                status: 'terminated_by_admin',
                actualEnd: new Date(),
                endedBy: 'admin',
                terminatedByAdminId: req.user.id,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, call }));
    }
    catch (error) {
        console.error('Error terminating video call:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to terminate call',
        }));
    }
});
exports.videoRouter.get('/stats', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId, date } = req.query;
        const targetDate = date ? new Date(String(date)) : new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        const where = {};
        if (facilityId)
            where.facilityId = String(facilityId);
        const [activeCalls, todayTotal, pendingRequests] = await Promise.all([
            shared_1.prisma.videoCall.count({
                where: { ...where, status: 'in_progress' },
            }),
            shared_1.prisma.videoCall.count({
                where: {
                    ...where,
                    scheduledStart: { gte: startOfDay, lte: endOfDay },
                },
            }),
            shared_1.prisma.videoCall.count({
                where: { ...where, status: 'requested' },
            }),
        ]);
        res.json((0, shared_1.createSuccessResponse)({ activeCalls, todayTotal, pendingRequests }));
    }
    catch (error) {
        console.error('Error fetching video stats:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch stats',
        }));
    }
});
exports.default = exports.videoRouter;
//# sourceMappingURL=routes.js.map