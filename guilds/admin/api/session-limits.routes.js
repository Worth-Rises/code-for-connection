"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionLimitsRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
exports.sessionLimitsRouter = (0, express_1.Router)();
function getDayBounds(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}
function getWeekBounds(date) {
    const day = date.getDay();
    const distanceFromMonday = (day + 6) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - distanceFromMonday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}
function getRemaining(limit, used, enabled) {
    if (!enabled) {
        return 0;
    }
    if (limit === null) {
        return null;
    }
    return Math.max(limit - used, 0);
}
async function getPersonLimitsAndUsage(incarceratedPersonId) {
    const person = await shared_1.prisma.incarceratedPerson.findUnique({
        where: { id: incarceratedPersonId },
        include: {
            housingUnit: {
                include: {
                    unitType: {
                        select: {
                            maxDailyVoiceCalls: true,
                            maxDailyMessages: true,
                            maxWeeklyVideoRequests: true,
                            voiceCallsEnabled: true,
                            videoCallsEnabled: true,
                            messagingEnabled: true,
                        },
                    },
                },
            },
        },
    });
    if (!person) {
        return null;
    }
    const now = new Date();
    const { start: dayStart } = getDayBounds(now);
    const { start: weekStart, end: weekEnd } = getWeekBounds(now);
    const [dailyUsage, weeklyVideoRequests] = await Promise.all([
        shared_1.prisma.dailyUsage.findUnique({
            where: {
                incarceratedPersonId_date: {
                    incarceratedPersonId,
                    date: dayStart,
                },
            },
            select: {
                voiceCallCount: true,
                messagesSent: true,
                videoCallCount: true,
            },
        }),
        shared_1.prisma.videoCall.count({
            where: {
                incarceratedPersonId,
                scheduledStart: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                status: {
                    not: 'denied',
                },
            },
        }),
    ]);
    return {
        personId: person.id,
        facilityId: person.facilityId,
        limits: {
            maxDailyVoiceCalls: person.housingUnit.unitType.maxDailyVoiceCalls,
            maxDailyMessages: person.housingUnit.unitType.maxDailyMessages,
            maxWeeklyVideoRequests: person.housingUnit.unitType.maxWeeklyVideoRequests,
            voiceCallsEnabled: person.housingUnit.unitType.voiceCallsEnabled,
            videoCallsEnabled: person.housingUnit.unitType.videoCallsEnabled,
            messagingEnabled: person.housingUnit.unitType.messagingEnabled,
        },
        usage: {
            voiceCallCount: dailyUsage?.voiceCallCount ?? 0,
            messagesSent: dailyUsage?.messagesSent ?? 0,
            videoCallCount: dailyUsage?.videoCallCount ?? 0,
        },
        weeklyVideoRequests,
    };
}
exports.sessionLimitsRouter.get('/unit-types/:unitTypeId/limits', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { unitTypeId } = req.params;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const unitType = await shared_1.prisma.housingUnitType.findFirst({
            where: {
                id: unitTypeId,
                agencyId: req.user.agencyId,
            },
            select: {
                id: true,
                name: true,
                maxDailyVoiceCalls: true,
                maxDailyMessages: true,
                maxWeeklyVideoRequests: true,
                voiceCallsEnabled: true,
                videoCallsEnabled: true,
                messagingEnabled: true,
            },
        });
        if (!unitType) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Housing unit type not found',
            }));
            return;
        }
        res.json((0, shared_1.createSuccessResponse)(unitType));
    }
    catch (error) {
        console.error('Error fetching unit type limits:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch unit type limits',
        }));
    }
});
exports.sessionLimitsRouter.patch('/unit-types/:unitTypeId/limits', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { unitTypeId } = req.params;
        const { maxDailyVoiceCalls, maxDailyMessages, maxWeeklyVideoRequests, voiceCallsEnabled, videoCallsEnabled, messagingEnabled, } = req.body;
        if (!req.user?.agencyId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Authenticated admin must have an agency',
            }));
            return;
        }
        const existing = await shared_1.prisma.housingUnitType.findFirst({
            where: {
                id: unitTypeId,
                agencyId: req.user.agencyId,
            },
            select: { id: true },
        });
        if (!existing) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Housing unit type not found',
            }));
            return;
        }
        const updated = await shared_1.prisma.housingUnitType.update({
            where: { id: unitTypeId },
            data: {
                ...(maxDailyVoiceCalls !== undefined ? { maxDailyVoiceCalls } : {}),
                ...(maxDailyMessages !== undefined ? { maxDailyMessages } : {}),
                ...(maxWeeklyVideoRequests !== undefined ? { maxWeeklyVideoRequests } : {}),
                ...(voiceCallsEnabled !== undefined ? { voiceCallsEnabled: Boolean(voiceCallsEnabled) } : {}),
                ...(videoCallsEnabled !== undefined ? { videoCallsEnabled: Boolean(videoCallsEnabled) } : {}),
                ...(messagingEnabled !== undefined ? { messagingEnabled: Boolean(messagingEnabled) } : {}),
            },
            select: {
                id: true,
                name: true,
                maxDailyVoiceCalls: true,
                maxDailyMessages: true,
                maxWeeklyVideoRequests: true,
                voiceCallsEnabled: true,
                videoCallsEnabled: true,
                messagingEnabled: true,
            },
        });
        res.json((0, shared_1.createSuccessResponse)(updated));
    }
    catch (error) {
        console.error('Error updating unit type limits:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to update unit type limits',
        }));
    }
});
exports.sessionLimitsRouter.get('/usage/:incarceratedPersonId', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { incarceratedPersonId } = req.params;
        const summary = await getPersonLimitsAndUsage(incarceratedPersonId);
        if (!summary) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Incarcerated person not found',
            }));
            return;
        }
        if (req.user?.role === 'facility_admin' && req.user.facilityId !== summary.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'No access to this incarcerated person',
            }));
            return;
        }
        res.json((0, shared_1.createSuccessResponse)({
            incarceratedPersonId: summary.personId,
            usage: summary.usage,
            weeklyVideoRequests: summary.weeklyVideoRequests,
            limits: summary.limits,
        }));
    }
    catch (error) {
        console.error('Error fetching daily usage:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch daily usage',
        }));
    }
});
exports.sessionLimitsRouter.get('/usage/:incarceratedPersonId/check', shared_1.requireAuth, (0, shared_1.requireRole)('facility_admin', 'agency_admin'), async (req, res) => {
    try {
        const { incarceratedPersonId } = req.params;
        const summary = await getPersonLimitsAndUsage(incarceratedPersonId);
        if (!summary) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Incarcerated person not found',
            }));
            return;
        }
        if (req.user?.role === 'facility_admin' && req.user.facilityId !== summary.facilityId) {
            res.status(403).json((0, shared_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'No access to this incarcerated person',
            }));
            return;
        }
        const remainingVoiceCalls = getRemaining(summary.limits.maxDailyVoiceCalls, summary.usage.voiceCallCount, summary.limits.voiceCallsEnabled);
        const remainingMessages = getRemaining(summary.limits.maxDailyMessages, summary.usage.messagesSent, summary.limits.messagingEnabled);
        const canMakeVoiceCall = summary.limits.voiceCallsEnabled &&
            (summary.limits.maxDailyVoiceCalls === null || summary.usage.voiceCallCount < summary.limits.maxDailyVoiceCalls);
        const canSendMessage = summary.limits.messagingEnabled &&
            (summary.limits.maxDailyMessages === null || summary.usage.messagesSent < summary.limits.maxDailyMessages);
        const canRequestVideo = summary.limits.videoCallsEnabled &&
            (summary.limits.maxWeeklyVideoRequests === null || summary.weeklyVideoRequests < summary.limits.maxWeeklyVideoRequests);
        res.json((0, shared_1.createSuccessResponse)({
            canMakeVoiceCall,
            canSendMessage,
            canRequestVideo,
            remainingVoiceCalls,
            remainingMessages,
        }));
    }
    catch (error) {
        console.error('Error checking session limits:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to check session limits',
        }));
    }
});
exports.default = exports.sessionLimitsRouter;
//# sourceMappingURL=session-limits.routes.js.map