#!/usr/bin/env tsx
/**
 * Run parser eval suite and enforce CI quality gates.
 * Usage: pnpm --filter @stipulate/parser eval:gate
 */
import { runEvalSuite, assertEvalGate } from '../src/eval/harness.js';

async function main(): Promise<void> {
  const report = await runEvalSuite();

  console.log(`Eval: ${report.passed}/${report.total} passed`);
  console.log(`Average score: ${report.averageScore}`);
  console.log(`Category precision: ${(report.precision * 100).toFixed(1)}%`);

  for (const result of report.results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`  ${status} ${result.fixtureId} (score=${result.score}, rules=${result.rulesExtracted})`);
    for (const err of result.errors) console.log(`      error: ${err}`);
    for (const warn of result.warnings) console.log(`      warn: ${warn}`);
  }

  assertEvalGate(report, {
    minPassRate: 0.8,
    minCategoryPrecision: 0.9,
    minCapPrecision: 0.85,
  });

  console.log('Eval gate passed.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
