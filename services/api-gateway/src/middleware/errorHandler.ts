import type { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from '@openconnect/shared';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(createErrorResponse({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  }));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json(createErrorResponse(err.toApiError()));
    return;
  }

  res.status(500).json(createErrorResponse({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  }));
}
