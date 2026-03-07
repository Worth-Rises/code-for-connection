"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = exports.prisma = void 0;
exports.disconnectDb = disconnectDb;
exports.connectDb = connectDb;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
exports.prisma = global.prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
async function disconnectDb() {
    await exports.prisma.$disconnect();
}
async function connectDb() {
    await exports.prisma.$connect();
}
//# sourceMappingURL=index.js.map