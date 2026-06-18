#!/usr/bin/env tsx
/** Process pending webhook delivery queue. Run via cron or worker. */
import { processWebhookQueue } from '../src/services/webhook-delivery.service.js';
import { disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const result = await processWebhookQueue({ limit: 100 });
  console.log(JSON.stringify({ ok: true, ...result }));
  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
