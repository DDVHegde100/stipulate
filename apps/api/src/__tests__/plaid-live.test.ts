import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('plaid live path', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
    process.env.PLAID_CLIENT_ID = 'plaid_test_client';
    process.env.PLAID_SECRET = 'plaid_test_secret';
    process.env.PLAID_ENV = 'sandbox';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
  });

  it('POST /v1/plaid/link-token uses Plaid API when keys are configured', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        expect(url).toContain('sandbox.plaid.com/link/token/create');
        return {
          ok: true,
          json: async () => ({
            link_token: 'link-sandbox-live-token',
            expiration: '2026-12-31T00:00:00Z',
          }),
        } as Response;
      }),
    );

    const app = createApp();
    const response = await app.request('/v1/plaid/link-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
        'X-Consumer-User-Id': '00000000-0000-4000-8000-000000000099',
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.linkToken).toBe('link-sandbox-live-token');
    expect(body.data.mode).toBe('sandbox');
  });
});
