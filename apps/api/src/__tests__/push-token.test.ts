import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';

describe('consumer push token API', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('POST /public/auth/push-token registers Expo token', async () => {
    const app = createApp();
    const response = await app.request('/public/auth/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '00000000-0000-4000-8000-000000000001',
      },
      body: JSON.stringify({ token: 'ExponentPushToken[test-token-abc]' }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.registered).toBe(true);
  });

  it('clears token when null is sent', async () => {
    const app = createApp();
    const response = await app.request('/public/auth/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '00000000-0000-4000-8000-000000000001',
      },
      body: JSON.stringify({ token: null }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.registered).toBe(false);
  });
});
