#!/usr/bin/env tsx
/**
 * Verify benefit_rules coverage meets production minimum.
 * Usage: pnpm --filter @stipulate/api verify:benefit-coverage [--min=75]
 */
import { getPool, disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const minArg = process.argv.find((arg) => arg.startsWith('--min='));
  const minCards = minArg ? Number(minArg.split('=')[1]) : 75;

  const pool = getPool();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT c.card_id)::text AS count
     FROM benefit_rules br
     JOIN cards c ON c.id = br.card_id
     WHERE c.is_active = TRUE`,
  );

  const count = Number(result.rows[0]?.count ?? 0);
  console.log(`Benefit coverage: ${count} active card(s) with rules (minimum ${minCards})`);

  await disconnectDatabase();

  if (count < minCards) {
    console.error(`Coverage below minimum — run db:seed-benefits --top${minCards}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Benefit coverage check failed:', err);
  process.exit(1);
});
