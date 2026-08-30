import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn({ err }, err.message);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {},
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: {},
  });
}
