"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.voiceRouter = (0, express_1.Router)();
exports.voiceRouter.get('/active-calls', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { facilityId } = req.query;
        const activeCalls = await shared_1.prisma.voiceCall.findMany({
            where: {
                status: { in: ['ringing', 'connected'] },
                ...(facilityId ? { facilityId: String(facilityId) } : {}),
            },
            include: {
                incarceratedPerson: true,
                familyMember: true,
            },
            orderBy: { startedAt: 'desc' },
        });
        res.json((0, shared_1.createSuccessResponse)(activeCalls));
    }
    catch (error) {
        console.error('Error fetching active calls:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch active calls',
        }));
    }
});
exports.voiceRouter.get('/call-logs', shared_1.requireAuth, async (req, res) => {
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
            where.startedAt = {
                ...(startDate ? { gte: new Date(String(startDate)) } : {}),
                ...(endDate ? { lte: new Date(String(endDate)) } : {}),
            };
        }
        const [calls, total] = await Promise.all([
            shared_1.prisma.voiceCall.findMany({
                where,
                include: {
                    incarceratedPerson: true,
                    familyMember: true,
                },
                skip,
                take,
                orderBy: { startedAt: 'desc' },
            }),
            shared_1.prisma.voiceCall.count({ where }),
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
        console.error('Error fetching call logs:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch call logs',
        }));
    }
});
exports.voiceRouter.post('/terminate-call/:callId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { callId } = req.params;
        const call = await shared_1.prisma.voiceCall.update({
            where: { id: callId },
            data: {
                status: 'terminated_by_admin',
                endedAt: new Date(),
                endedBy: 'admin',
                terminatedByAdminId: req.user.id,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, call }));
    }
    catch (error) {
        console.error('Error terminating call:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to terminate call',
        }));
    }
});
exports.voiceRouter.get('/stats', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
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
        const [activeCalls, todayTotal] = await Promise.all([
            shared_1.prisma.voiceCall.count({
                where: {
                    ...where,
                    status: { in: ['ringing', 'connected'] },
                },
            }),
            shared_1.prisma.voiceCall.count({
                where: {
                    ...where,
                    startedAt: { gte: startOfDay, lte: endOfDay },
                },
            }),
        ]);
        res.json((0, shared_1.createSuccessResponse)({ activeCalls, todayTotal }));
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch stats',
        }));
    }
});
// Session limit check — can this person make a voice call?
exports.voiceRouter.get('/check-limit/:incarceratedPersonId', shared_1.requireAuth, async (req, res) => {
    try {
        const { incarceratedPersonId } = req.params;
        const person = await shared_1.prisma.incarceratedPerson.findUnique({
            where: { id: incarceratedPersonId },
            include: {
                housingUnit: { include: { unitType: true } },
            },
        });
        if (!person) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Person not found',
            }));
            return;
        }
        const unitType = person.housingUnit.unitType;
        // Check if voice calls are enabled for this unit type
        if (!unitType.voiceCallsEnabled) {
            res.json((0, shared_1.createSuccessResponse)({
                allowed: false,
                reason: 'Voice calls are disabled for this housing unit type',
                limits: {
                    voiceCallsEnabled: false,
                    maxDailyVoiceCalls: unitType.maxDailyVoiceCalls,
                    voiceCallDurationMinutes: unitType.voiceCallDurationMinutes,
                },
            }));
            return;
        }
        // Check calling hours
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (currentTime < unitType.callingHoursStart || currentTime > unitType.callingHoursEnd) {
            res.json((0, shared_1.createSuccessResponse)({
                allowed: false,
                reason: `Voice calls are only available between ${unitType.callingHoursStart} and ${unitType.callingHoursEnd}`,
                limits: {
                    voiceCallsEnabled: true,
                    callingHoursStart: unitType.callingHoursStart,
                    callingHoursEnd: unitType.callingHoursEnd,
                },
            }));
            return;
        }
        // Check daily limit if configured
        if (unitType.maxDailyVoiceCalls !== null) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const usage = await shared_1.prisma.dailyUsage.findUnique({
                where: {
                    incarceratedPersonId_date: {
                        incarceratedPersonId,
                        date: today,
                    },
                },
            });
            const currentCount = usage?.voiceCallCount ?? 0;
            const remaining = unitType.maxDailyVoiceCalls - currentCount;
            if (remaining <= 0) {
                res.json((0, shared_1.createSuccessResponse)({
                    allowed: false,
                    reason: `Daily voice call limit reached (${unitType.maxDailyVoiceCalls} per day)`,
                    limits: {
                        voiceCallsEnabled: true,
                        maxDailyVoiceCalls: unitType.maxDailyVoiceCalls,
                        usedToday: currentCount,
                        remaining: 0,
                    },
                }));
                return;
            }
            res.json((0, shared_1.createSuccessResponse)({
                allowed: true,
                limits: {
                    voiceCallsEnabled: true,
                    maxDailyVoiceCalls: unitType.maxDailyVoiceCalls,
                    voiceCallDurationMinutes: unitType.voiceCallDurationMinutes,
                    usedToday: currentCount,
                    remaining,
                },
            }));
            return;
        }
        // No daily limit configured — allowed
        res.json((0, shared_1.createSuccessResponse)({
            allowed: true,
            limits: {
                voiceCallsEnabled: true,
                maxDailyVoiceCalls: null,
                voiceCallDurationMinutes: unitType.voiceCallDurationMinutes,
            },
        }));
    }
    catch (error) {
        console.error('Error checking voice call limit:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to check voice call limit',
        }));
    }
});
// Increment daily usage after a call starts
exports.voiceRouter.post('/record-usage/:incarceratedPersonId', shared_1.requireAuth, async (req, res) => {
    try {
        const { incarceratedPersonId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const usage = await shared_1.prisma.dailyUsage.upsert({
            where: {
                incarceratedPersonId_date: {
                    incarceratedPersonId,
                    date: today,
                },
            },
            update: {
                voiceCallCount: { increment: 1 },
            },
            create: {
                incarceratedPersonId,
                date: today,
                voiceCallCount: 1,
            },
        });
        res.json((0, shared_1.createSuccessResponse)({ success: true, usage }));
    }
    catch (error) {
        console.error('Error recording usage:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to record usage',
        }));
    }
});
exports.default = exports.voiceRouter;
//# sourceMappingURL=routes.js.map