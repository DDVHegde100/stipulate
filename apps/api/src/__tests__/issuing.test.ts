import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('issuing API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('POST /v1/issuing/cardholders creates sandbox cardholder', async () => {
    const app = createApp();
    const login = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@stipulate.io',
        password: 'demo-password-123',
      }),
    });
    const cookie = login.headers.get('Set-Cookie') ?? '';

    const response = await app.request('/v1/issuing/cardholders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        Cookie: cookie.split(';')[0] ?? '',
      },
      body: JSON.stringify({ programSlug: 'stipulate_sandbox' }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.status).toBe('approved');
    expect(body.data.programSlug).toBe('stipulate_sandbox');
  });

  it('POST /v1/issuing/cards/virtual issues a virtual card', async () => {
    const app = createApp();
    const userId = '00000000-0000-4000-8000-000000000001';

    const cardholder = await app.request('/v1/issuing/cardholders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': userId,
      },
      body: JSON.stringify({}),
    });
    const cardholderBody = await cardholder.json();

    const response = await app.request('/v1/issuing/cards/virtual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({ cardholderId: cardholderBody.data.id }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.last4).toHaveLength(4);
    expect(body.data.panToken).toBeTruthy();
  });
});
