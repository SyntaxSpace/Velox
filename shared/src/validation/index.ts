/**
 * Velox Shared Validation Schemas
 *
 * Zod schemas for request validation, shared between frontend and backend.
 * This ensures a single source of truth for validation rules.
 *
 * Uses Zod v4 API.
 */

import { z } from 'zod';
import { PaymentMethod } from '../enums/index.js';
import { AUTH, FILE_UPLOAD } from '../constants/index.js';

// ─── Auth Schemas ────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Invalid email address'),
  password: z
    .string()
    .min(
      AUTH.MIN_PASSWORD_LENGTH,
      `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`,
    ),
});

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Order Schemas ───────────────────────────────────────────────────

export const createOrderSchema = z.object({
  shopId: z.uuid('Invalid shop ID'),
  copies: z
    .number()
    .int()
    .min(FILE_UPLOAD.MIN_COPIES, `Minimum ${FILE_UPLOAD.MIN_COPIES} copy`)
    .max(FILE_UPLOAD.MAX_COPIES, `Maximum ${FILE_UPLOAD.MAX_COPIES} copies`),
  color: z.boolean(),
  doubleSided: z.boolean(),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

// ─── File Upload Schema ──────────────────────────────────────────────

export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.literal('application/pdf').or(z.literal('image/png')).or(z.literal('image/jpeg')),
  size: z
    .number()
    .max(FILE_UPLOAD.MAX_SIZE_BYTES, `File size must not exceed ${FILE_UPLOAD.MAX_SIZE_MB}MB`),
});

// ─── Pagination Schema ──────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── UUID Param Schema ───────────────────────────────────────────────

export const uuidParamSchema = z.object({
  id: z.uuid('Invalid ID format'),
});

// ─── Export inferred types ───────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
