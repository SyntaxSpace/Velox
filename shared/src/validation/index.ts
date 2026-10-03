/**
 * Velox Shared Validation Schemas
 *
 * Zod schemas for request validation, shared between frontend and backend.
 * This ensures a single source of truth for validation rules.
 *
 * Uses Zod v4 API.
 */

import { z } from 'zod';
import { PaymentMethod, UserRole } from '../enums/index.js';
import { AUTH, FILE_UPLOAD } from '../constants/index.js';

// ─── Auth Schemas ────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole).optional(),
  password: z
    .string()
    .min(
      AUTH.MIN_PASSWORD_LENGTH,
      `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`,
    ),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Shop Schemas (Day 7) ───────────────────────────────────────────

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(20),
  address: z.string().min(3, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  pincode: z.string().min(4, 'Pincode is required').max(10),
  operatingHours: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const publicShopIdParamSchema = z.object({
  publicShopId: z.string().min(1, 'Public Shop ID is required').max(50),
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

export const provisionShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100),
  ownerEmail: z.string().email('Invalid owner email address'),
  ownerPhone: z.string().max(20).optional(),
  temporaryPassword: z
    .string()
    .min(6, 'Temporary password must be at least 6 characters')
    .optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().max(10).optional(),
  operatingHours: z.string().max(100).optional(),
  pricePerPageBW: z.coerce.number().min(0).optional(),
  pricePerPageColor: z.coerce.number().min(0).optional(),
  duplexDiscount: z.coerce.number().min(0).optional(),
});

export const updatePricingSchema = z.object({
  pricePerPageBW: z.coerce.number().min(0.1, 'B&W price must be at least 0.1').optional(),
  pricePerPageColor: z.coerce.number().min(0.1, 'Color price must be at least 0.1').optional(),
  duplexDiscount: z.coerce.number().min(0, 'Discount cannot be negative').optional(),
});

export const firstLoginPasswordSchema = z.object({
  temporaryPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(
      AUTH.MIN_PASSWORD_LENGTH,
      `Password must be at least ${AUTH.MIN_PASSWORD_LENGTH} characters`,
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateShopInput = z.infer<typeof createShopSchema>;
export type ProvisionShopSchemaInput = z.infer<typeof provisionShopSchema>;
export type UpdatePricingSchemaInput = z.infer<typeof updatePricingSchema>;
export type FirstLoginPasswordSchemaInput = z.infer<typeof firstLoginPasswordSchema>;
export type PublicShopIdParamInput = z.infer<typeof publicShopIdParamSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type FileUploadInput = z.infer<typeof fileUploadSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
