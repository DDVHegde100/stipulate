import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('status integrations', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    delete process.env.RESEND_API_KEY;
    delete process.env.PLAID_CLIENT_ID;
    delete process.env.PLAID_SECRET;
  });

  it('GET /status exposes integration flags', async () => {
    const app = createApp();
    const response = await app.request('/status');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.checks.integrations.emailAlerts).toBe(false);
    expect(body.checks.integrations.pushAlerts).toBe(true);
    expect(body.checks.integrations.plaid).toBe(false);
    expect(body.checks.integrations.emailDelivery).toBeDefined();
  });

  it('GET /status marks email and plaid configured when env is set', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.PLAID_CLIENT_ID = 'plaid_client';
    process.env.PLAID_SECRET = 'plaid_secret';
    resetEnvCache();

    const app = createApp();
    const response = await app.request('/status');
    const body = await response.json();
    expect(body.checks.integrations.emailAlerts).toBe(true);
    expect(body.checks.integrations.plaid).toBe(true);
  });
});
