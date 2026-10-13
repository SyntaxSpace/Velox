import { z } from 'zod';

export const createOrderBodySchema = z.object({
  shopId: z.string().min(1, 'Invalid shop ID'),
  copies: z.coerce
    .number()
    .int()
    .min(1, 'Minimum 1 copy')
    .max(100, 'Maximum 100 copies')
    .default(1),
  color: z.enum(['bw', 'color']).default('bw'),
  doubleSided: z.preprocess((val) => val === true || val === 'true', z.boolean()).default(false),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  paperSize: z.enum(['A4', 'A3', 'Letter', 'Legal']).default('A4'),
  paymentMethod: z.enum(['UPI', 'COUNTER', 'CARD']).default('COUNTER'),
  pageCount: z.coerce.number().int().min(1).max(5000).optional(),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().min(1, 'Invalid order ID'),
});

export const shopOrdersParamSchema = z.object({
  shopId: z.string().min(1, 'Invalid shop ID'),
});

export const shopOrderParamsSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID'),
  orderId: z.string().uuid('Invalid order ID'),
});

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export const cancelOrderParamSchema = z.object({
  orderId: z.string().min(1, 'Invalid order ID'),
});

export const transitionOrderBodySchema = z.object({
  status: z.string().min(1, 'Status is required'),
});
