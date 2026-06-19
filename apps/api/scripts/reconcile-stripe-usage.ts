#!/usr/bin/env tsx
/**
 * Reconcile Stripe metered usage against local usage_events totals.
 * Usage: pnpm --filter @stipulate/api reconcile:stripe
 */
import { query, disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const result = await query<{
    org_id: string;
    slug: string;
    total_calls: string;
    total_cost_micros: string;
  }>(
    `SELECT o.id AS org_id, o.slug, COUNT(ue.id)::text AS total_calls,
            COALESCE(SUM(ue.cost_micros), 0)::text AS total_cost_micros
     FROM organizations o
     LEFT JOIN usage_events ue ON ue.org_id = o.id AND ue.created_at >= $1::timestamptz
     GROUP BY o.id, o.slug
     HAVING COUNT(ue.id) > 0
     ORDER BY COUNT(ue.id) DESC`,
    [since.toISOString()],
  );

  console.log(`Stripe usage reconciliation since ${since.toISOString().slice(0, 10)}`);
  console.log('─'.repeat(60));

  let totalCalls = 0;
  let totalMicros = 0;

  for (const row of result.rows) {
    const calls = Number(row.total_calls);
    const micros = Number(row.total_cost_micros);
    totalCalls += calls;
    totalMicros += micros;
    console.log(
      `  ${row.slug.padEnd(24)} ${String(calls).padStart(8)} calls  $${(micros / 1_000_000).toFixed(4)}`,
    );
  }

  console.log('─'.repeat(60));
  console.log(`  ${'TOTAL'.padEnd(24)} ${String(totalCalls).padStart(8)} calls  $${(totalMicros / 1_000_000).toFixed(4)}`);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('\nNote: STRIPE_SECRET_KEY not set — local totals only (no Stripe API sync).');
  } else {
    console.log('\nStripe meter sync: compare totals above with Stripe Billing → Meters dashboard.');
  }

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Reconciliation failed:', err);
  process.exit(1);
});
