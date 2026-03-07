"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
exports.extractTokenFromHeader = extractTokenFromHeader;
exports.isTokenExpired = isTokenExpired;
exports.getUserRoleFromPayload = getUserRoleFromPayload;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
function generateToken(user) {
    const payload = {
        sub: user.id,
        role: user.role,
        agencyId: user.agencyId,
        facilityId: user.facilityId,
        housingUnitId: user.housingUnitId,
    };
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch {
        return null;
    }
}
function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
function isTokenExpired(payload) {
    return Date.now() >= payload.exp * 1000;
}
function getUserRoleFromPayload(payload) {
    return payload.role;
}
//# sourceMappingURL=jwt.js.map