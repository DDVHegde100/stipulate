#!/usr/bin/env tsx
/** Poll Postgres for queued ingestion jobs and run parser pipeline. */
import { drainIngestionQueue } from '../src/services/ingestion-pipeline.service.js';
import { disconnectDatabase } from '../src/lib/db.js';

const LIMIT = parseInt(process.env.INGESTION_WORKER_BATCH ?? '5', 10);
const INTERVAL_MS = parseInt(process.env.INGESTION_WORKER_INTERVAL_MS ?? '5000', 10);

async function tick(): Promise<void> {
  const { processed } = await drainIngestionQueue(LIMIT);
  if (processed > 0) {
    console.log(JSON.stringify({ ok: true, processed, at: new Date().toISOString() }));
  }
}

async function main(): Promise<void> {
  const once = process.argv.includes('--once');
  if (once) {
    await tick();
    await disconnectDatabase();
    return;
  }

  console.log(`Ingestion worker started (batch=${LIMIT}, interval=${INTERVAL_MS}ms)`);
  const timer = setInterval(() => {
    void tick();
  }, INTERVAL_MS);

  process.on('SIGINT', () => {
    clearInterval(timer);
    void disconnectDatabase().then(() => process.exit(0));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
