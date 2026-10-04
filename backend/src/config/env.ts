import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    HOST: z.string().default('127.0.0.1'),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((value) => /^postgres(?:ql)?:\/\//.test(value), 'Must be a PostgreSQL URL'),
    JWT_SECRET: z.string().min(1),
    JWT_REFRESH_SECRET: z.string().min(1),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    UPLOAD_MAX_SIZE: z.coerce.number().default(52428800),
    UPLOAD_DIR: z.string().min(1).default('uploads'),
    UPLOAD_STORAGE: z.enum(['local', 'supabase']).default('local'),
    SUPABASE_URL: z.string().url().optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('velox-print-documents'),
  })
  .superRefine((values, context) => {
    const origins = values.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['CORS_ORIGIN'],
        message: 'At least one allowed origin is required',
      });
    }

    if (values.UPLOAD_STORAGE === 'supabase') {
      for (const key of ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'] as const) {
        if (!values[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: 'Required when UPLOAD_STORAGE=supabase',
          });
        }
      }
    }

    if (values.NODE_ENV !== 'production') return;

    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (values[key].length < 32) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Must be at least 32 characters in production',
        });
      }
    }

    if (values.JWT_SECRET === values.JWT_REFRESH_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'Must differ from JWT_SECRET in production',
      });
    }

    for (const origin of origins) {
      try {
        const parsedOrigin = new URL(origin);
        if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== origin) {
          throw new Error('Invalid production origin');
        }
      } catch {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CORS_ORIGIN'],
          message: 'Production origins must be exact HTTPS origins without paths',
        });
        break;
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write(
    `Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}\n`,
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: [
    ...new Set(
      parsed.data.CORS_ORIGIN.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ],
};
