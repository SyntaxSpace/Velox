import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const registerValidator = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginValidator = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshValidator = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerValidator>;
export type LoginInput = z.infer<typeof loginValidator>;
export type RefreshInput = z.infer<typeof refreshValidator>;
