import { describe, expect, it, afterEach } from 'vitest';

import { loadEnv, resetEnvCache } from '../config/env.js';

const PRODUCTION_BASE = {
  NODE_ENV: 'production',
  API_KEY: 'prod_api_key_16chars',
  DATABASE_URL: 'postgresql://user:pass@host:5432/stipulate?sslmode=require',
  REDIS_URL: 'redis://localhost:6379',
  CORS_ORIGINS: 'https://stipulate.io',
  SENTRY_DSN: 'https://sentry.io/123',
};

describe('production env validation', () => {
  afterEach(() => {
    resetEnvCache();
  });

  it('accepts a valid production configuration', () => {
    const env = loadEnv({ ...PRODUCTION_BASE });
    expect(env.NODE_ENV).toBe('production');
  });

  it('rejects wildcard CORS in production', () => {
    expect(() =>
      loadEnv({
        ...PRODUCTION_BASE,
        CORS_ORIGINS: '*',
      }),
    ).toThrow(/wildcard/i);
  });

  it('rejects database without SSL in production', () => {
    expect(() =>
      loadEnv({
        ...PRODUCTION_BASE,
        DATABASE_URL: 'postgresql://user:pass@host:5432/stipulate',
      }),
    ).toThrow(/SSL/i);
  });

  it('requires SENTRY_DSN in production', () => {
    const { SENTRY_DSN: _, ...withoutSentry } = PRODUCTION_BASE;
    expect(() => loadEnv(withoutSentry)).toThrow(/SENTRY_DSN/i);
  });

  it('requires stripe webhook secret when stripe key is set', () => {
    expect(() =>
      loadEnv({
        ...PRODUCTION_BASE,
        STRIPE_SECRET_KEY: 'sk_live_test',
      }),
    ).toThrow(/STRIPE_WEBHOOK_SECRET/i);
  });
});
