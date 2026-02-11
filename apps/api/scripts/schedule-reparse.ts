#!/usr/bin/env tsx
/**
 * Weekly benefit guide re-parse scheduler.
 * Usage: pnpm --filter @stipulate/api schedule:reparse
 */
import {
  ReparseScheduler,
  summarizeReparseBatch,
  type ReparseTarget,
} from '@stipulate/parser';

const DEFAULT_TARGETS: ReparseTarget[] = [
  {
    cardId: 'chase_sapphire_preferred',
    issuer: 'Chase',
    productName: 'Sapphire Preferred',
    sourceUrl: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
  },
  {
    cardId: 'amex_gold',
    issuer: 'American Express',
    productName: 'Gold Card',
    sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
  },
];

async function main(): Promise<void> {
  const targets = DEFAULT_TARGETS;
  const scheduler = new ReparseScheduler({
    onJobComplete: (result) => {
      const status = result.error ? 'FAILED' : result.changed ? 'CHANGED' : 'UNCHANGED';
      console.log(`[${status}] ${result.cardId} (${result.durationMs}ms)`);
    },
  });

  scheduler.enqueueAll(targets);
  console.log(`Starting re-parse for ${targets.length} cards...`);

  const results = await scheduler.runConcurrent(2);
  const summary = summarizeReparseBatch(results);

  console.log('\nBatch summary:');
  console.log(`  Total:     ${summary.total}`);
  console.log(`  Changed:   ${summary.changed}`);
  console.log(`  Unchanged: ${summary.unchanged}`);
  console.log(`  Failed:    ${summary.failed}`);

  if (summary.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
