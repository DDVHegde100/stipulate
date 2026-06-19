#!/usr/bin/env tsx
/**
 * Seed benefit_rules from parser golden fixtures via the benefit pipeline.
 * Usage: pnpm --filter @stipulate/api db:seed-benefits
 */
import { GOLDEN_FIXTURES, runBenefitPipeline, StubLLMClient } from '@stipulate/parser';
import { disconnectDatabase, withTransaction } from '../src/lib/db.js';
import * as benefitRepo from '../src/repositories/benefit.repository.js';

async function main(): Promise<void> {
  console.log(`Seeding benefit rules from ${GOLDEN_FIXTURES.length} golden fixtures`);

  const llmClient = new StubLLMClient();
  let published = 0;

  for (const fixture of GOLDEN_FIXTURES) {
    const card = await benefitRepo.findCardUuid(fixture.cardId);
    if (!card) {
      console.warn(`  skip ${fixture.cardId} — card not in catalog (run db:seed first)`);
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
      console.warn(`  skip ${fixture.cardId} — no rules extracted`);
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
        changeSummary: `Seeded ${rules.length} rules from golden fixture ${fixture.id}`,
      });
    });

    published++;
    console.log(`  ✓ ${fixture.cardId}: ${rules.length} rules (v${nextVersion})`);
  }

  console.log(`Published benefit rules for ${published}/${GOLDEN_FIXTURES.length} cards.`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Benefit seed failed:', err);
  process.exit(1);
});
