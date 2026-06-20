#!/usr/bin/env tsx
/**
 * Seed benefit_rules from parser fixtures via the benefit pipeline.
 * Usage: pnpm --filter @stipulate/api db:seed-benefits [--top25|--golden]
 */
import { GOLDEN_FIXTURES, runBenefitPipeline, StubLLMClient, TOP25_FIXTURES } from '@stipulate/parser';
import { disconnectDatabase, withTransaction } from '../src/lib/db.js';
import * as benefitRepo from '../src/repositories/benefit.repository.js';
import { prewarmCardBundles } from '../src/cache/prewarm.js';
import { connectRedis, disconnectRedis } from '../src/lib/redis.js';

type SeedMode = 'top25' | 'golden';

function resolveFixtures(): typeof GOLDEN_FIXTURES {
  const arg = process.argv[2];
  if (arg === '--golden') return GOLDEN_FIXTURES;
  return TOP25_FIXTURES;
}

async function main(): Promise<void> {
  const fixtures = resolveFixtures();
  console.log(`Seeding benefit rules from ${fixtures.length} fixtures`);

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
