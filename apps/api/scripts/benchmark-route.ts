#!/usr/bin/env tsx
/**
 * Routing hot-path benchmark — measures p50/p95/p99 latency.
 * Usage: pnpm --filter @stipulate/api benchmark:route
 */
import {
  routeTransaction,
  DEFAULT_VALUATION_TABLE,
  DEMO_CARD_BUNDLES,
} from '@stipulate/routing';
import { RouteRequestSchema } from '@stipulate/schema';

const ITERATIONS = parseInt(process.env.BENCH_ITERATIONS ?? '1000', 10);
const P99_LIMIT_MS = parseFloat(process.env.BENCH_P99_LIMIT_MS ?? '20');

const SAMPLE_REQUEST = RouteRequestSchema.parse({
  merchantName: 'Starbucks',
  mcc: '5814',
  amount: { amountMinor: 650, currency: 'USD' },
  userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
});

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

async function main(): Promise<void> {
  const latencies: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    routeTransaction(
      SAMPLE_REQUEST,
      DEMO_CARD_BUNDLES,
      { valuation: DEFAULT_VALUATION_TABLE },
      `bench-${i}`,
    );
    latencies.push(performance.now() - start);
  }

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log(`\nRouting benchmark (${ITERATIONS} iterations)`);
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);
  console.log(`  max: ${latencies[latencies.length - 1]!.toFixed(2)}ms`);

  if (p99 > P99_LIMIT_MS) {
    console.error(`\nFAIL: p99 ${p99.toFixed(2)}ms exceeds ${P99_LIMIT_MS}ms limit`);
    process.exit(1);
  }

  console.log(`\nPASS: p99 within ${P99_LIMIT_MS}ms guardrail`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
