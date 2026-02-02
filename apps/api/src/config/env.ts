import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema.default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://stipulate:stipulate@localhost:5432/stipulate'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    API_VERSION: z
      .string()
      .regex(/^v\d+$/, 'API_VERSION must follow the format v1, v2, etc.')
      .default('v1'),
    API_KEY: z
      .string()
      .min(16, 'API_KEY must be at least 16 characters for production use')
      .optional(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    CORS_ORIGINS: z
      .string()
      .default('*')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' && !data.API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'API_KEY is required when NODE_ENV is production',
        path: ['API_KEY'],
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
export type NodeEnv = z.infer<typeof nodeEnvSchema>;

let cachedEnv: Env | undefined;

/**
 * Parse and validate process environment variables once at startup.
 * Subsequent calls return the cached result.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Reset cached env — intended for tests only. */
export function resetEnvCache(): void {
  cachedEnv = undefined;
}

export function isProduction(env: Env = loadEnv()): boolean {
  return env.NODE_ENV === 'production';
}

export function isDevelopment(env: Env = loadEnv()): boolean {
  return env.NODE_ENV === 'development';
}

export function isTest(env: Env = loadEnv()): boolean {
  return env.NODE_ENV === 'test';
}
