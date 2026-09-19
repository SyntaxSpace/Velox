import { z } from 'zod';

export const shopIdParamSchema = z.object({
  shopId: z.string().uuid('Invalid shop ID format'),
});
