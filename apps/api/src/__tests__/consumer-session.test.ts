import { describe, expect, it, beforeEach } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('consumer session auth', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('POST /public/auth/login sets session cookie', async () => {
    const app = createApp();
    const response = await app.request('/public/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'demo@stipulate.io',
        password: 'demo-password-123',
      }),
    });

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('Set-Cookie');
    expect(setCookie).toContain('stipulate_session=');
  });

  it('GET /public/auth/me returns user from session cookie', async () => {
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
    const response = await app.request('/public/auth/me', {
      headers: { Cookie: cookie.split(';')[0] ?? '' },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.email).toBe('demo@stipulate.io');
  });

  it('POST /public/auth/logout clears session cookie', async () => {
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
    const response = await app.request('/public/auth/logout', {
      method: 'POST',
      headers: { Cookie: cookie.split(';')[0] ?? '' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
