"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.hashPin = hashPin;
exports.verifyPin = verifyPin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
async function hashPin(pin) {
    return bcryptjs_1.default.hash(pin, SALT_ROUNDS);
}
async function verifyPin(pin, hash) {
    return bcryptjs_1.default.compare(pin, hash);
}
//# sourceMappingURL=password.js.map