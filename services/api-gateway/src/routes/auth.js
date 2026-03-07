"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const shared_1 = require("@openconnect/shared");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/pin-login', async (req, res) => {
    try {
        const { pin, facilityId } = req.body;
        if (!pin || !facilityId) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'PIN and facility ID are required',
            }));
            return;
        }
        const incarceratedPersons = await shared_1.prisma.incarceratedPerson.findMany({
            where: {
                facilityId,
                status: 'active',
            },
        });
        let matchedPerson = null;
        for (const person of incarceratedPersons) {
            const isMatch = await bcryptjs_1.default.compare(pin, person.pin);
            if (isMatch) {
                matchedPerson = person;
                break;
            }
        }
        if (!matchedPerson) {
            res.status(401).json((0, shared_1.createErrorResponse)({
                code: 'INVALID_PIN',
                message: 'Invalid PIN',
            }));
            return;
        }
        const user = {
            id: matchedPerson.id,
            role: 'incarcerated',
            firstName: matchedPerson.firstName,
            lastName: matchedPerson.lastName,
            agencyId: matchedPerson.agencyId,
            facilityId: matchedPerson.facilityId,
            housingUnitId: matchedPerson.housingUnitId,
        };
        const token = (0, shared_1.generateToken)(user);
        const response = { token, user };
        res.json((0, shared_1.createSuccessResponse)(response));
    }
    catch (error) {
        console.error('PIN login error:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Login failed',
        }));
    }
});
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'Email and password are required',
            }));
            return;
        }
        const familyMember = await shared_1.prisma.familyMember.findUnique({
            where: { email },
        });
        if (familyMember) {
            const isValidPassword = await bcryptjs_1.default.compare(password, familyMember.passwordHash);
            if (!isValidPassword) {
                res.status(401).json((0, shared_1.createErrorResponse)({
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                }));
                return;
            }
            if (familyMember.isBlockedAgencyWide) {
                res.status(403).json((0, shared_1.createErrorResponse)({
                    code: 'ACCOUNT_BLOCKED',
                    message: 'Your account has been blocked',
                }));
                return;
            }
            const user = {
                id: familyMember.id,
                role: 'family',
                email: familyMember.email,
                firstName: familyMember.firstName,
                lastName: familyMember.lastName,
            };
            const token = (0, shared_1.generateToken)(user);
            const response = { token, user };
            res.json((0, shared_1.createSuccessResponse)(response));
            return;
        }
        const adminUser = await shared_1.prisma.adminUser.findUnique({
            where: { email },
        });
        if (adminUser) {
            const isValidPassword = await bcryptjs_1.default.compare(password, adminUser.passwordHash);
            if (!isValidPassword) {
                res.status(401).json((0, shared_1.createErrorResponse)({
                    code: 'INVALID_CREDENTIALS',
                    message: 'Invalid email or password',
                }));
                return;
            }
            const user = {
                id: adminUser.id,
                role: adminUser.role === 'agency_admin' ? 'agency_admin' : 'facility_admin',
                email: adminUser.email,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                agencyId: adminUser.agencyId,
                facilityId: adminUser.facilityId ?? undefined,
            };
            const token = (0, shared_1.generateToken)(user);
            const response = { token, user };
            res.json((0, shared_1.createSuccessResponse)(response));
            return;
        }
        res.status(401).json((0, shared_1.createErrorResponse)({
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
        }));
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Login failed',
        }));
    }
});
exports.authRouter.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone } = req.body;
        if (!email || !password || !firstName || !lastName || !phone) {
            res.status(400).json((0, shared_1.createErrorResponse)({
                code: 'VALIDATION_ERROR',
                message: 'All fields are required',
            }));
            return;
        }
        const existingUser = await shared_1.prisma.familyMember.findUnique({
            where: { email },
        });
        if (existingUser) {
            res.status(409).json((0, shared_1.createErrorResponse)({
                code: 'EMAIL_EXISTS',
                message: 'An account with this email already exists',
            }));
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const familyMember = await shared_1.prisma.familyMember.create({
            data: {
                email,
                passwordHash,
                firstName,
                lastName,
                phone,
            },
        });
        const user = {
            id: familyMember.id,
            role: 'family',
            email: familyMember.email,
            firstName: familyMember.firstName,
            lastName: familyMember.lastName,
        };
        const token = (0, shared_1.generateToken)(user);
        const response = { token, user };
        res.status(201).json((0, shared_1.createSuccessResponse)(response));
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json((0, shared_1.createErrorResponse)({
            code: 'INTERNAL_ERROR',
            message: 'Registration failed',
        }));
    }
});
exports.authRouter.get('/me', shared_1.requireAuth, (req, res) => {
    res.json((0, shared_1.createSuccessResponse)(req.user));
});
exports.authRouter.post('/logout', shared_1.requireAuth, (_req, res) => {
    res.json((0, shared_1.createSuccessResponse)({ message: 'Logged out successfully' }));
});
//# sourceMappingURL=auth.js.map