#!/usr/bin/env tsx
/**
 * Seed benefit_rules from parser fixtures via the benefit pipeline.
 * Usage: pnpm --filter @stipulate/api db:seed-benefits [--golden|--top25|--top75|--top150]
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GOLDEN_FIXTURES,
  runBenefitPipeline,
  StubLLMClient,
  TOP25_FIXTURES,
  buildTop75Fixtures,
  buildTop150Fixtures,
  type EvalFixture,
} from '@stipulate/parser';
import { parseCatalogJson } from '@stipulate/schema';
import { disconnectDatabase, withTransaction } from '../src/lib/db.js';
import * as benefitRepo from '../src/repositories/benefit.repository.js';
import { prewarmCardBundles } from '../src/cache/prewarm.js';
import { connectRedis, disconnectRedis } from '../src/lib/redis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '../../../packages/schema/data/cards/catalog-full.json');

type SeedMode = 'golden' | 'top25' | 'top75' | 'top150';

function resolveMode(): SeedMode {
  const arg = process.argv[2];
  if (arg === '--golden') return 'golden';
  if (arg === '--top150') return 'top150';
  if (arg === '--top75') return 'top75';
  return 'top25';
}

function loadFixtures(mode: SeedMode): EvalFixture[] {
  if (mode === 'golden') return GOLDEN_FIXTURES;

  const catalog = parseCatalogJson(JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')));
  const cards = catalog.cards.map((c) => ({
    id: c.id,
    issuer: c.issuer,
    productName: c.productName,
  }));

  if (mode === 'top75') return buildTop75Fixtures(cards);
  if (mode === 'top150') return buildTop150Fixtures(cards);
  return TOP25_FIXTURES;
}

async function main(): Promise<void> {
  const mode = resolveMode();
  const fixtures = loadFixtures(mode);
  console.log(`Seeding benefit rules from ${fixtures.length} fixtures (${mode})`);

  const llmClient = new StubLLMClient();
  let published = 0;
  const seededCardIds: string[] = [];

  for (const fixture of fixtures) {
    const card = await benefitRepo.findCardUuid(fixture.cardId);
    if (!card) {
      console.warn(`  skip ${fixture.cardId}: card not in catalog (run db:seed first)`);
      continue;
    }

    const result = await runBenefitPipeline(
      {
        cardId: fixture.cardId,
        issuer: fixture.issuer,
        productName: fixture.productName,
        llmModel: 'stub',
        skipExtraction: true,
        dryRun: false,
      },
      { llmClient, sourceText: fixture.sourceText },
    );

    const rules = result.normalizedRules ?? [];
    if (rules.length === 0) {
      console.warn(`  skip ${fixture.cardId}: no rules extracted`);
      continue;
    }

    const previousVersion = await benefitRepo.getLatestVersion(card.uuid);
    const nextVersion = previousVersion + 1;

    await withTransaction(async (client) => {
      await benefitRepo.upsertBenefitRules(client, {
        cardUuid: card.uuid,
        rules,
        sourceUrl: `fixture://${fixture.id}`,
        version: nextVersion,
      });

      await benefitRepo.publishBenefitVersion(client, {
        cardUuid: card.uuid,
        version: nextVersion,
        snapshot: {
          cardId: fixture.cardId,
          version: nextVersion,
          rules,
          source: fixture.id,
        },
        changeSummary: `Seeded ${rules.length} rules from fixture ${fixture.id}`,
        ruleCount: rules.length,
      });
    });

    published++;
    seededCardIds.push(fixture.cardId);
    console.log(`  ✓ ${fixture.cardId}: ${rules.length} rules (v${nextVersion})`);
  }

  console.log(`Published benefit rules for ${published}/${fixtures.length} cards.`);

  if (seededCardIds.length > 0) {
    await connectRedis();
    const warmed = await prewarmCardBundles(seededCardIds);
    console.log(`Prewarmed Redis cache for ${warmed} card bundle(s).`);
    await disconnectRedis();
  }

  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Benefit seed failed:', err);
  process.exit(1);
});
