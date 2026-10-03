import { z } from 'zod';

export const shopIdParamSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
});

export const publicShopIdParamSchema = z.object({
  publicShopId: z.string().min(1, 'Public Shop ID is required').max(50),
});

export const createShopBodySchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters').max(100),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(20),
  address: z.string().min(3, 'Address is required').max(500),
  city: z.string().min(2, 'City is required').max(100),
  pincode: z.string().min(4, 'Pincode is required').max(10),
  operatingHours: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const updateShopBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(8).max(20).optional(),
  address: z.string().min(3).max(500).optional(),
  city: z.string().min(2).max(100).optional(),
  pincode: z.string().min(4).max(10).optional(),
  operatingHours: z.string().max(100).optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  pricePerPageBW: z.coerce.number().min(0.1).optional(),
  pricePerPageColor: z.coerce.number().min(0.1).optional(),
  duplexDiscount: z.coerce.number().min(0).optional(),
});

export const provisionShopBodySchema = z.object({
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

export const updatePricingBodySchema = z.object({
  pricePerPageBW: z.coerce.number().min(0.1).optional(),
  pricePerPageColor: z.coerce.number().min(0.1).optional(),
  duplexDiscount: z.coerce.number().min(0).optional(),
});

export type CreateShopBody = z.infer<typeof createShopBodySchema>;
export type UpdateShopBody = z.infer<typeof updateShopBodySchema>;
export type ProvisionShopBody = z.infer<typeof provisionShopBodySchema>;
export type UpdatePricingBody = z.infer<typeof updatePricingBodySchema>;
