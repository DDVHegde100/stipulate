#!/usr/bin/env tsx
/**
 * Apply pending database migrations.
 * Usage: pnpm --filter @stipulate/api db:migrate
 */
import { getPool, disconnectDatabase } from '../src/lib/db.js';
import { runMigrations, getMigrationStatus } from '../src/db/migrate.js';

async function main(): Promise<void> {
  const pool = getPool();
  const before = await getMigrationStatus(pool);

  console.log('Migration status before:');
  console.log(`  Applied: ${before.applied.length ? before.applied.join(', ') : '(none)'}`);
  console.log(`  Pending: ${before.pending.length ? before.pending.join(', ') : '(none)'}`);

  const applied = await runMigrations(pool);

  if (applied.length === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`Applied ${applied.length} migration(s): ${applied.join(', ')}`);
  }

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
