import { Hono } from 'hono';

import type { AppBindings } from '../app.js';
import { checkDatabaseHealth } from '../lib/db.js';
import { pingRedis } from '../lib/redis.js';
import { loadEnv } from '../config/env.js';

export const healthRoutes = new Hono<AppBindings>();

healthRoutes.get('/', (c) => {
  const env = loadEnv();

  return c.json({
    status: 'ok',
    service: '@stipulate/api',
    version: env.API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get('/live', (c) => {
  return c.json({
    status: 'ok',
    check: 'liveness',
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get('/ready', async (c) => {
  const [database, redis] = await Promise.all([
    checkDatabaseHealth(),
    pingRedis().then((ok) => ({ ok, latencyMs: 0 })),
  ]);

  const ready = database.ok && redis.ok;

  return c.json(
    {
      status: ready ? 'ok' : 'degraded',
      check: 'readiness',
      dependencies: {
        postgres: database,
        redis: {
          ok: redis.ok,
        },
      },
      timestamp: new Date().toISOString(),
    },
    ready ? 200 : 503,
  );
});
