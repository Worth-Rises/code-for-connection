"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedNumberError = exports.OutsideCallingHoursError = exports.ContactNotApprovedError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.AppError = void 0;
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
class AppError extends Error {
    code;
    statusCode;
    constructor(code, message, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
    toApiError() {
        return {
            code: this.code,
            message: this.message,
        };
    }
}
exports.AppError = AppError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super('NOT_FOUND', `${resource} not found`, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message) {
        super('VALIDATION_ERROR', message, 400);
    }
}
exports.ValidationError = ValidationError;
class ContactNotApprovedError extends AppError {
    constructor() {
        super('CONTACT_NOT_APPROVED', 'This contact has not been approved for communication.', 403);
    }
}
exports.ContactNotApprovedError = ContactNotApprovedError;
class OutsideCallingHoursError extends AppError {
    constructor() {
        super('OUTSIDE_CALLING_HOURS', 'Calls are not allowed at this time.', 403);
    }
}
exports.OutsideCallingHoursError = OutsideCallingHoursError;
class BlockedNumberError extends AppError {
    constructor() {
        super('BLOCKED_NUMBER', 'This phone number has been blocked.', 403);
    }
}
exports.BlockedNumberError = BlockedNumberError;
function createSuccessResponse(data, pagination) {
    const response = {
        success: true,
        data,
    };
    if (pagination) {
        response.pagination = pagination;
    }
    return response;
}
function createErrorResponse(error) {
    return {
        success: false,
        error,
    };
}
//# sourceMappingURL=errors.js.map