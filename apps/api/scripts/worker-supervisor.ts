#!/usr/bin/env tsx
/**
 * Long-running worker supervisor for webhook delivery and ingestion polling.
 * Usage: pnpm --filter @stipulate/api worker:supervisor
 */
import { processWebhookQueue } from '../src/services/webhook-delivery.service.js';
import { drainIngestionQueue } from '../src/services/ingestion-pipeline.service.js';
import { createChildLogger } from '../src/lib/logger.js';
import { connectRedis, disconnectRedis } from '../src/lib/redis.js';
import { disconnectDatabase } from '../src/lib/db.js';

const log = createChildLogger({ component: 'worker-supervisor' });

const WEBHOOK_INTERVAL_MS = Number(process.env.WEBHOOK_POLL_MS ?? 15_000);
const INGESTION_INTERVAL_MS = Number(process.env.INGESTION_POLL_MS ?? 30_000);

async function runWebhookCycle(): Promise<void> {
  try {
    const result = await processWebhookQueue({ limit: 50 });
    if (result.processed > 0) {
      log.info(result, 'Webhook delivery cycle complete');
    }
  } catch (error) {
    log.error({ err: error }, 'Webhook cycle failed');
  }
}

async function runIngestionCycle(): Promise<void> {
  try {
    const { processed } = await drainIngestionQueue(5);
    if (processed > 0) {
      log.info({ processed }, 'Ingestion cycle processed jobs');
    }
  } catch (error) {
    log.error({ err: error }, 'Ingestion cycle failed');
  }
}

async function main(): Promise<void> {
  log.info('Worker supervisor starting');
  await connectRedis();

  setInterval(() => void runWebhookCycle(), WEBHOOK_INTERVAL_MS);
  setInterval(() => void runIngestionCycle(), INGESTION_INTERVAL_MS);

  await runWebhookCycle();
  await runIngestionCycle();
}

const shutdown = async (signal: string) => {
  log.info({ signal }, 'Worker supervisor shutting down');
  await Promise.allSettled([disconnectRedis(), disconnectDatabase()]);
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((error) => {
  log.error({ err: error }, 'Worker supervisor crashed');
  process.exit(1);
});
