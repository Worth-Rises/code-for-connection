import type { ApiResponse, ApiError } from '../types/api.js';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class ContactNotApprovedError extends AppError {
  constructor() {
    super('CONTACT_NOT_APPROVED', 'This contact has not been approved for communication.', 403);
  }
}

export class OutsideCallingHoursError extends AppError {
  constructor() {
    super('OUTSIDE_CALLING_HOURS', 'Calls are not allowed at this time.', 403);
  }
}

export class BlockedNumberError extends AppError {
  constructor() {
    super('BLOCKED_NUMBER', 'This phone number has been blocked.', 403);
  }
}

export function createSuccessResponse<T>(data: T, pagination?: ApiResponse<T>['pagination']): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return response;
}

export function createErrorResponse(error: ApiError): ApiResponse<never> {
  return {
    success: false,
    error,
  };
}
