import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('health routes', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();

    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.API_KEY;
  });

  it('GET /health returns service metadata', async () => {
    const app = createApp();
    const response = await app.request('/health');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      service: '@stipulate/api',
      version: 'v1',
    });
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it('GET /health/live returns liveness probe', async () => {
    const app = createApp();
    const response = await app.request('/health/live');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: 'ok',
      check: 'liveness',
    });
  });

  it('GET /health/ready reports dependency status', async () => {
    const app = createApp();
    const response = await app.request('/health/ready');
    const body = await response.json();

    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(body).toMatchObject({
      check: 'readiness',
      dependencies: {
        postgres: expect.objectContaining({
          ok: expect.any(Boolean),
          latencyMs: expect.any(Number),
        }),
        redis: expect.objectContaining({
          ok: expect.any(Boolean),
        }),
      },
    });
  });

  it('GET / returns API index payload', async () => {
    const app = createApp();
    const response = await app.request('/');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      name: '@stipulate/api',
      version: 'v1',
      health: '/health',
    });
  });

  it('assigns x-request-id on every response', async () => {
    const app = createApp();
    const response = await app.request('/health');

    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-response-time')).toMatch(/^\d+(\.\d+)?ms$/);
  });

  it('POST /v1/route validates request body', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -5 }),
    });

    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toEqual(expect.any(String));
  });

  it('POST /v1/route returns card recommendation for valid payload', async () => {
    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 120.5,
        currency: 'USD',
        merchant: {
          merchantName: 'Blue Bottle Coffee',
          category: 'dining',
        },
        cards: [
          {
            issuer: 'Chase',
            productName: 'Sapphire Preferred',
            network: 'visa',
          },
          {
            issuer: 'American Express',
            productName: 'Gold Card',
            network: 'amex',
          },
        ],
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.recommended).toBeTruthy();
    expect(body.data.recommended.card.network).toEqual(expect.any(String));
    expect(body.data.alternatives.length).toBeGreaterThanOrEqual(0);
  });

  it('POST /v1/enrich normalizes merchant metadata', async () => {
    const app = createApp();
    const response = await app.request('/v1/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantName: 'Trader Joe\'s #123',
        mcc: '5411',
      }),
    });

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.merchant).toMatchObject({
      category: 'groceries',
      mcc: '5411',
      confidence: expect.any(Number),
    });
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await app.request('/does-not-exist');
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid API keys when configured', async () => {
    process.env.API_KEY = 'test-api-key-123456';

    const app = createApp();
    const response = await app.request('/v1/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'wrong-key',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
  });

  it('accepts valid API keys when configured', async () => {
    process.env.API_KEY = 'test-api-key-123456';

    const app = createApp();
    const response = await app.request('/v1', {
      headers: {
        'X-API-Key': 'test-api-key-123456',
      },
    });

    expect(response.status).toBe(200);
  });
});

describe('env validation', () => {
  beforeEach(() => {
    resetEnvCache();
    vi.unstubAllEnvs();
  });

  it('requires API_KEY in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.API_KEY;

    await expect(async () => {
      resetEnvCache();
      const { loadEnv } = await import('../config/env.js');
      loadEnv();
    }).rejects.toThrow(/API_KEY is required/);
  });
});
