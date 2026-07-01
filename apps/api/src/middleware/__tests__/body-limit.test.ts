import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { bodyLimit } from '../body-limit.js';

describe('bodyLimit middleware', () => {
  it('rejects content-length above production limit', async () => {
    const app = new Hono();
    app.use('*', bodyLimit);
    app.post('/test', (c) => c.json({ ok: true }));

    const res = await app.request('http://localhost/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '2000000',
      },
      body: '{}',
    });

    expect(res.status).toBe(413);
  });

  it('allows requests within limit in test env', async () => {
    const app = new Hono();
    app.use('*', bodyLimit);
    app.post('/test', (c) => c.json({ ok: true }));

    const res = await app.request('http://localhost/test', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '12',
      },
      body: '{"ok":true}',
    });

    expect(res.status).toBe(200);
  });
});
