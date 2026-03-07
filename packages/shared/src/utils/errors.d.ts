import type { ApiResponse, ApiError } from '../types/api.js';
export declare class AppError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode?: number);
    toApiError(): ApiError;
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ValidationError extends AppError {
    constructor(message: string);
}
export declare class ContactNotApprovedError extends AppError {
    constructor();
}
export declare class OutsideCallingHoursError extends AppError {
    constructor();
}
export declare class BlockedNumberError extends AppError {
    constructor();
}
export declare function createSuccessResponse<T>(data: T, pagination?: ApiResponse<T>['pagination']): ApiResponse<T>;
export declare function createErrorResponse(error: ApiError): ApiResponse<never>;
//# sourceMappingURL=errors.d.ts.map