#!/usr/bin/env tsx
/**
 * Weekly benefit guide re-parse scheduler.
 * Usage: pnpm --filter @stipulate/api schedule:reparse
 */
import { runScheduledReparse } from '../src/services/reparse.service.js';

async function main(): Promise<void> {
  console.log('Starting scheduled reparse run...');

  const { runId, summary, enqueued } = await runScheduledReparse({
    limit: Number(process.env.REPARSE_LIMIT ?? 50),
    concurrency: Number(process.env.REPARSE_CONCURRENCY ?? 3),
  });

  console.log(`Run ${runId} complete`);
  console.log(`  Checked:   ${summary.total}`);
  console.log(`  Changed:   ${summary.changed}`);
  console.log(`  Unchanged: ${summary.unchanged}`);
  console.log(`  Failed:    ${summary.failed}`);
  console.log(`  Enqueued:  ${enqueued}`);

  if (summary.failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
