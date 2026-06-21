#!/usr/bin/env tsx
/**
 * Purge consumer accounts and orgs past their GDPR deletion grace period.
 * Usage: pnpm --filter @stipulate/api purge:deletions
 */
import { purgeDueDeletions } from '../src/services/gdpr-purge.service.js';
import { disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const summary = await purgeDueDeletions();
  console.log(
    `GDPR purge complete: ${summary.consumersPurged} consumer(s), ${summary.orgsPurged} org(s) at ${summary.purgedAt}`,
  );
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('GDPR purge failed:', err);
  process.exit(1);
});
