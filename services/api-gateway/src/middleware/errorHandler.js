"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const shared_1 = require("@openconnect/shared");
function notFoundHandler(req, res) {
    res.status(404).json((0, shared_1.createErrorResponse)({
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
    }));
}
function errorHandler(err, _req, res, _next) {
    console.error('Error:', err);
    if (err instanceof shared_1.AppError) {
        res.status(err.statusCode).json((0, shared_1.createErrorResponse)(err.toApiError()));
        return;
    }
    res.status(500).json((0, shared_1.createErrorResponse)({
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
    }));
}
//# sourceMappingURL=errorHandler.js.map