#!/usr/bin/env tsx
/**
 * One-shot ingestion queue drain for scheduled CI/cron.
 * Usage: pnpm --filter @stipulate/api schedule:ingestion
 */
import { drainIngestionQueue } from '../src/services/ingestion-pipeline.service.js';
import { disconnectDatabase } from '../src/lib/db.js';
import { connectRedis, disconnectRedis } from '../src/lib/redis.js';

async function main(): Promise<void> {
  const limit = Number(process.env.INGESTION_DRAIN_LIMIT ?? 10);
  await connectRedis().catch(() => undefined);
  const { processed } = await drainIngestionQueue(limit);
  console.log(`Ingestion drain complete: ${processed} jobs processed`);
  if (processed === 0) process.exit(0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectRedis().catch(() => undefined);
    await disconnectDatabase();
  });
