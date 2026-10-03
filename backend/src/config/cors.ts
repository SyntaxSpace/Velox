import type { CorsOptions } from 'cors';
import { env } from './env';

export const corsOptions: CorsOptions = {
  origin: env.CORS_ORIGINS,
  credentials: true,
};
