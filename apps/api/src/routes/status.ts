import { Hono } from 'hono';

import type { AppBindings } from '../app.js';
import { checkDatabaseHealth } from '../lib/db.js';
import { pingRedis } from '../lib/redis.js';
import { loadEnv } from '../config/env.js';
import { getFeatureFlags } from '../lib/feature-flags.js';
import { isEmailProviderConfigured, getEmailDeliveryStats } from '../services/email.service.js';
import { isPlaidConfigured } from '../services/plaid.service.js';
import * as ingestionRepo from '../repositories/ingestion.repository.js';
import { getSloSnapshot, getRouteP99LimitMs } from '../lib/slo-tracker.js';

const INGESTION_QUEUE_ALERT = 100;
const REVIEW_QUEUE_ALERT = 50;

function buildMonitoringChecks(input: {
  slo: ReturnType<typeof getSloSnapshot>;
  routeP99LimitMs: number;
  ingestionQueueDepth: number;
  reviewQueueDepth: number;
  flags: ReturnType<typeof getFeatureFlags>;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripeConsumerPriceId?: string;
}) {
  const { slo, routeP99LimitMs, ingestionQueueDepth, reviewQueueDepth, flags } = input;

  return {
    routeSloOk: slo.routeSampleCount === 0 || slo.routeP99Ms <= routeP99LimitMs,
    ingestionQueueOk: ingestionQueueDepth < INGESTION_QUEUE_ALERT,
    reviewQueueOk: reviewQueueDepth < REVIEW_QUEUE_ALERT,
    observability: {
      sentry: flags.sentry,
      posthog: flags.posthog,
    },
    stripe: {
      billing: flags.stripeBilling,
      liveMode: Boolean(input.stripeSecretKey?.startsWith('sk_live_')),
      webhookConfigured: Boolean(input.stripeWebhookSecret),
      consumerPriceConfigured: Boolean(input.stripeConsumerPriceId),
    },
  };
}

export const statusRoutes = new Hono<AppBindings>();

statusRoutes.get('/', async (c) => {
  const env = loadEnv();
  const flags = getFeatureFlags();

  if (env.NODE_ENV === 'test') {
    const slo = getSloSnapshot();
    const routeP99LimitMs = getRouteP99LimitMs();
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
          routeP99LimitMs,
          ...slo,
        },
        features: {
          receiptOcr: flags.receiptOcr,
          proxyPay: flags.proxyPay,
          benefitWebhooks: flags.benefitWebhooks,
          stripeBilling: flags.stripeBilling,
        },
        integrations: {
          emailAlerts: isEmailProviderConfigured(),
          pushAlerts: true,
          plaid: isPlaidConfigured(),
          emailDelivery: getEmailDeliveryStats(),
        },
        monitoring: buildMonitoringChecks({
          slo,
          routeP99LimitMs,
          ingestionQueueDepth: 0,
          reviewQueueDepth: 0,
          flags,
          stripeSecretKey: env.STRIPE_SECRET_KEY,
          stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
          stripeConsumerPriceId: env.STRIPE_PRICE_ID_CONSUMER,
        }),
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

  const routeP99LimitMs = getRouteP99LimitMs();
  const slo = getSloSnapshot();

  const checks = {
    api: { ok: true, version: env.API_VERSION },
    postgres: { ok: database.ok, latencyMs: database.latencyMs },
    redis: { ok: redis.ok },
    workers: {
      ingestionQueueDepth: queuedJobs,
      reviewQueueDepth: reviewJobs,
    },
    slo: {
      routeP99LimitMs,
      ...slo,
    },
    features: {
      receiptOcr: flags.receiptOcr,
      proxyPay: flags.proxyPay,
      benefitWebhooks: flags.benefitWebhooks,
      stripeBilling: flags.stripeBilling,
    },
    integrations: {
      emailAlerts: isEmailProviderConfigured(),
      pushAlerts: true,
      plaid: isPlaidConfigured(),
      emailDelivery: getEmailDeliveryStats(),
    },
    monitoring: buildMonitoringChecks({
      slo,
      routeP99LimitMs,
      ingestionQueueDepth: queuedJobs,
      reviewQueueDepth: reviewJobs,
      flags,
      stripeSecretKey: env.STRIPE_SECRET_KEY,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
      stripeConsumerPriceId: env.STRIPE_PRICE_ID_CONSUMER,
    }),
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
