#!/usr/bin/env tsx
/**
 * Batch parse benefit guides for cards missing rules.
 * Usage: pnpm --filter @stipulate/api batch:parse [--limit=50]
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { batchParseBenefits } from '@stipulate/parser';
import { parseCatalogJson } from '@stipulate/schema';
import { disconnectDatabase } from '../src/lib/db.js';
import * as catalogRepo from '../src/repositories/catalog.repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1] ?? '50', 10) : 50;

  const gaps = await catalogRepo.listCatalogCoverage({ limit, offset: 0, missingOnly: true });
  const catalogPath = join(__dirname, '../../../packages/schema/data/cards/catalog-full.json');
  const catalog = parseCatalogJson(JSON.parse(readFileSync(catalogPath, 'utf-8')));

  const targets = gaps.rows.map((row) => {
    const card = catalog.cards.find((c) => c.id === row.card_id);
    return {
      cardId: row.card_id,
      issuer: card?.issuer ?? row.issuer_name ?? 'Unknown',
      productName: card?.productName ?? row.name,
      benefitGuideUrl: row.benefit_guide_url ?? card?.benefitGuideUrl,
    };
  });

  console.log(`Batch parsing ${targets.length} cards missing benefit rules...`);
  const report = await batchParseBenefits(targets, { dryRun: true });
  console.log(`Succeeded: ${report.succeeded}/${report.total}`);

  for (const result of report.results) {
    const mark = result.success ? '✓' : '✗';
    console.log(`  ${mark} ${result.cardId}: ${result.rulesExtracted} rules (${result.durationMs}ms)${result.error ? ` — ${result.error}` : ''}`);
  }

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Batch parse failed:', err);
  process.exit(1);
});
