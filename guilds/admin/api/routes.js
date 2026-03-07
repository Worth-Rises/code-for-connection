"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const shared_1 = require("@openconnect/shared");
const keyword_alerts_routes_js_1 = require("./keyword-alerts.routes.js");
const flagged_content_routes_js_1 = require("./flagged-content.routes.js");
const session_limits_routes_js_1 = require("./session-limits.routes.js");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use('/keyword-alerts', keyword_alerts_routes_js_1.keywordAlertsRouter);
exports.adminRouter.use('/flagged-content', flagged_content_routes_js_1.flaggedContentRouter);
exports.adminRouter.use('/session-limits', session_limits_routes_js_1.sessionLimitsRouter);
exports.adminRouter.get('/contacts/:incarceratedPersonId', shared_1.requireAuth, async (req, res) => {
    try {
        const { incarceratedPersonId } = req.params;
        const contacts = await shared_1.prisma.approvedContact.findMany({
            where: {
                incarceratedPersonId,
                status: 'approved',
            },
            include: {
                familyMember: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true,
                    },
                },
            },
        });
        res.json((0, shared_1.createSuccessResponse)(contacts));
    }
    catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch contacts',
        }));
    }
});
exports.adminRouter.get('/contacts/check', shared_1.requireAuth, async (req, res) => {
    try {
        const { incarceratedPersonId, familyMemberId } = req.query;
        if (!incarceratedPersonId || !familyMemberId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'incarceratedPersonId and familyMemberId are required',
            }));
            return;
        }
        const contact = await shared_1.prisma.approvedContact.findUnique({
            where: {
                incarceratedPersonId_familyMemberId: {
                    incarceratedPersonId: String(incarceratedPersonId),
                    familyMemberId: String(familyMemberId),
                },
            },
        });
        res.json((0, shared_1.createSuccessResponse)({
            approved: contact?.status === 'approved',
            isAttorney: contact?.isAttorney ?? false,
        }));
    }
    catch (error) {
        console.error('Error checking contact:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to check contact',
        }));
    }
});
exports.adminRouter.get('/facility/:facilityId', shared_1.requireAuth, async (req, res) => {
    try {
        const { facilityId } = req.params;
        const facility = await shared_1.prisma.facility.findUnique({
            where: { id: facilityId },
            include: {
                agency: true,
                housingUnits: {
                    include: { unitType: true },
                },
            },
        });
        if (!facility) {
            res.status(404).json((0, shared_1.createErrorResponse)({
                code: 'NOT_FOUND',
                message: 'Facility not found',
            }));
            return;
        }
        res.json((0, shared_1.createSuccessResponse)(facility));
    }
    catch (error) {
        console.error('Error fetching facility:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch facility',
        }));
    }
});
exports.adminRouter.get('/facilities', async (_req, res) => {
    try {
        const facilities = await shared_1.prisma.facility.findMany({
            select: {
                id: true,
                name: true,
                agencyId: true,
            },
        });
        res.json((0, shared_1.createSuccessResponse)(facilities));
    }
    catch (error) {
        console.error('Error fetching facilities:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch facilities',
        }));
    }
});
exports.adminRouter.get('/housing-unit-type/:unitTypeId', shared_1.requireAuth, async (req, res) => {
    try {
        const { unitTypeId } = req.params;
        const unitType = await shared_1.prisma.housingUnitType.findUnique({
            where: { id: unitTypeId },
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
        console.error('Error fetching housing unit type:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch housing unit type',
        }));
    }
});
exports.adminRouter.get('/user/:userId', shared_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const incarceratedPerson = await shared_1.prisma.incarceratedPerson.findUnique({
            where: { id: userId },
            include: {
                facility: true,
                housingUnit: { include: { unitType: true } },
            },
        });
        if (incarceratedPerson) {
            res.json((0, shared_1.createSuccessResponse)({ type: 'incarcerated', user: incarceratedPerson }));
            return;
        }
        const familyMember = await shared_1.prisma.familyMember.findUnique({
            where: { id: userId },
        });
        if (familyMember) {
            const { passwordHash, ...safeUser } = familyMember;
            res.json((0, shared_1.createSuccessResponse)({ type: 'family', user: safeUser }));
            return;
        }
        res.status(404).json((0, shared_1.createErrorResponse)({
            code: 'NOT_FOUND',
            message: 'User not found',
        }));
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch user',
        }));
    }
});
exports.adminRouter.get('/blocked-numbers/check', shared_1.requireAuth, async (req, res) => {
    try {
        const { phoneNumber, facilityId } = req.query;
        if (!phoneNumber) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'phoneNumber is required',
            }));
            return;
        }
        const blockedNumber = await shared_1.prisma.blockedNumber.findFirst({
            where: {
                phoneNumber: String(phoneNumber),
                OR: [
                    { scope: 'agency' },
                    { scope: 'facility', facilityId: facilityId ? String(facilityId) : undefined },
                ],
            },
        });
        res.json((0, shared_1.createSuccessResponse)({
            blocked: !!blockedNumber,
            scope: blockedNumber?.scope,
        }));
    }
    catch (error) {
        console.error('Error checking blocked number:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Failed to check blocked number',
        }));
    }
});
exports.default = exports.adminRouter;
//# sourceMappingURL=routes.js.map