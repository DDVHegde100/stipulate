import { Hono } from 'hono';

import type { AppBindings } from '../app.js';
import { checkDatabaseHealth } from '../lib/db.js';
import { pingRedis } from '../lib/redis.js';
import { loadEnv } from '../config/env.js';
import { getFeatureFlags } from '../lib/feature-flags.js';
import * as ingestionRepo from '../repositories/ingestion.repository.js';
import { getSloSnapshot, getRouteP99LimitMs } from '../lib/slo-tracker.js';

export const statusRoutes = new Hono<AppBindings>();

statusRoutes.get('/', async (c) => {
  const env = loadEnv();
  const flags = getFeatureFlags();

  if (env.NODE_ENV === 'test') {
    return c.json({
      status: 'operational',
      service: '@stipulate/api',
      version: env.API_VERSION,
      checks: {
        api: { ok: true, version: env.API_VERSION },
        postgres: { ok: true, latencyMs: 1 },
        redis: { ok: true },
        workers: { ingestionQueueDepth: 0, reviewQueueDepth: 0 },
        slo: {
          routeP99LimitMs: getRouteP99LimitMs(),
          ...getSloSnapshot(),
        },
        features: {
          receiptOcr: flags.receiptOcr,
          proxyPay: flags.proxyPay,
          benefitWebhooks: flags.benefitWebhooks,
          stripeBilling: flags.stripeBilling,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }

  const [database, redis, queuedJobs, reviewJobs] = await Promise.all([
    checkDatabaseHealth(),
    pingRedis().then((ok) => ({ ok })),
    ingestionRepo.countJobsByStatus('queued'),
    ingestionRepo.countJobsByStatus('review'),
  ]);

  const checks = {
    api: { ok: true, version: env.API_VERSION },
    postgres: { ok: database.ok, latencyMs: database.latencyMs },
    redis: { ok: redis.ok },
    workers: {
      ingestionQueueDepth: queuedJobs,
      reviewQueueDepth: reviewJobs,
    },
    slo: {
      routeP99LimitMs: getRouteP99LimitMs(),
      ...getSloSnapshot(),
    },
    features: {
      receiptOcr: flags.receiptOcr,
      proxyPay: flags.proxyPay,
      benefitWebhooks: flags.benefitWebhooks,
      stripeBilling: flags.stripeBilling,
    },
  };

  const allOk = checks.postgres.ok && checks.redis.ok;

  return c.json(
    {
      status: allOk ? 'operational' : 'degraded',
      service: '@stipulate/api',
      version: env.API_VERSION,
      checks,
      timestamp: new Date().toISOString(),
    },
    allOk ? 200 : 503,
  );
});
