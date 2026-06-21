import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import { exportConsumerData, scheduleConsumerDeletion } from '../services/consumer-gdpr.service.js';

describe('consumer GDPR export', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('exportConsumerData returns profile and subscription bundle', async () => {
    const bundle = await exportConsumerData('00000000-0000-4000-8000-000000000001');
    expect(bundle.user.email).toBe('demo@stipulate.io');
    expect(bundle.subscription.plan).toBeDefined();
    expect(Array.isArray(bundle.linkedAccounts)).toBe(true);
  });

  it('GET /public/auth/export returns export bundle for authenticated user', async () => {
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

    const response = await app.request('/public/auth/export', {
      headers: { Cookie: cookie.split(';')[0] ?? '' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.user.email).toBe('demo@stipulate.io');
    expect(body.data.exportedAt).toBeTruthy();
  });

  it('POST /public/auth/delete schedules deletion and clears session', async () => {
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

    const response = await app.request('/public/auth/delete', {
      method: 'POST',
      headers: { Cookie: cookie.split(';')[0] ?? '' },
    });

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.data.status).toBe('scheduled');
    expect(body.data.scheduledFor).toBeTruthy();

    const exportAfter = await exportConsumerData('00000000-0000-4000-8000-000000000001');
    expect(exportAfter.deletionRequest?.status).toBe('scheduled');
  });
});
