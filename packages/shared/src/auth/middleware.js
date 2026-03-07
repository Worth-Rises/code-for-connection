"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requireFacilityAccess = requireFacilityAccess;
exports.optionalAuth = optionalAuth;
const jwt_js_1 = require("./jwt.js");
const index_js_1 = require("../db/index.js");
const errors_js_1 = require("../utils/errors.js");
async function getUserFromPayload(payload) {
    const { sub: id, role, agencyId, facilityId, housingUnitId } = payload;
    let firstName = '';
    let lastName = '';
    let email;
    if (role === 'incarcerated') {
        const person = await index_js_1.prisma.incarceratedPerson.findUnique({
            where: { id },
            select: { firstName: true, lastName: true },
        });
        if (!person)
            return null;
        firstName = person.firstName;
        lastName = person.lastName;
    }
    else if (role === 'family') {
        const member = await index_js_1.prisma.familyMember.findUnique({
            where: { id },
            select: { firstName: true, lastName: true, email: true },
        });
        if (!member)
            return null;
        firstName = member.firstName;
        lastName = member.lastName;
        email = member.email;
    }
    else {
        const admin = await index_js_1.prisma.adminUser.findUnique({
            where: { id },
            select: { firstName: true, lastName: true, email: true },
        });
        if (!admin)
            return null;
        firstName = admin.firstName;
        lastName = admin.lastName;
        email = admin.email;
    }
    return {
        id,
        role,
        email,
        firstName,
        lastName,
        agencyId,
        facilityId,
        housingUnitId,
    };
}
async function requireAuth(req, res, next) {
    try {
        const token = (0, jwt_js_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            res.status(401).json((0, errors_js_1.createErrorResponse)({
                code: 'UNAUTHORIZED',
                message: 'No token provided',
            }));
            return;
        }
        const payload = (0, jwt_js_1.verifyToken)(token);
        if (!payload) {
            res.status(401).json((0, errors_js_1.createErrorResponse)({
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            }));
            return;
        }
        const user = await getUserFromPayload(payload);
        if (!user) {
            res.status(401).json((0, errors_js_1.createErrorResponse)({
                code: 'UNAUTHORIZED',
                message: 'User not found',
            }));
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json((0, errors_js_1.createErrorResponse)({
            code: 'UNAUTHORIZED',
            message: 'Authentication failed',
        }));
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json((0, errors_js_1.createErrorResponse)({
                code: 'UNAUTHORIZED',
                message: 'Not authenticated',
            }));
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json((0, errors_js_1.createErrorResponse)({
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
            }));
            return;
        }
        next();
    };
}
function requireFacilityAccess(facilityIdParam = 'facilityId') {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json((0, errors_js_1.createErrorResponse)({
                code: 'UNAUTHORIZED',
                message: 'Not authenticated',
            }));
            return;
        }
        const facilityId = req.params[facilityIdParam] || req.query[facilityIdParam];
        if (req.user.role === 'agency_admin') {
            next();
            return;
        }
        if (req.user.role === 'facility_admin' && req.user.facilityId === facilityId) {
            next();
            return;
        }
        if (req.user.role === 'incarcerated' && req.user.facilityId === facilityId) {
            next();
            return;
        }
        res.status(403).json((0, errors_js_1.createErrorResponse)({
            code: 'FORBIDDEN',
            message: 'No access to this facility',
        }));
    };
}
function optionalAuth(req, res, next) {
    const token = (0, jwt_js_1.extractTokenFromHeader)(req.headers.authorization);
    if (!token) {
        next();
        return;
    }
    const payload = (0, jwt_js_1.verifyToken)(token);
    if (payload) {
        getUserFromPayload(payload).then(user => {
            if (user) {
                req.user = user;
            }
            next();
        }).catch(() => next());
    }
    else {
        next();
    }
}
//# sourceMappingURL=middleware.js.map