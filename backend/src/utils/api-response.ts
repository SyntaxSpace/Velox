import { Response } from 'express';

export interface SuccessResponseData<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponseData {
  success: false;
  message: string;
  error: Record<string, unknown>;
}

export interface PaginatedResponseData<T = unknown> {
  success: true;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies SuccessResponseData<T>);
}

export function sendError(
  res: Response,
  message: string,
  error: Record<string, unknown> = {},
  statusCode = 400,
): void {
  res.status(statusCode).json({
    success: false,
    message,
    error,
  } satisfies ErrorResponseData);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Success',
): void {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  } satisfies PaginatedResponseData<T>);
}
