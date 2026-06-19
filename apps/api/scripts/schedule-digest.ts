#!/usr/bin/env tsx
/**
 * Send weekly benefit change digest to consumers.
 * Usage: pnpm --filter @stipulate/api schedule:digest
 */
import { sendWeeklyBenefitDigest } from '../src/services/benefit-digest.service.js';
import { disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const days = Number(process.env.DIGEST_DAYS ?? 7);
  const result = await sendWeeklyBenefitDigest(days);
  console.log(`Digest complete: ${result.emailed} emails for ${result.events} events`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => disconnectDatabase());
