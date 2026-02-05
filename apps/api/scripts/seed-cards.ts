#!/usr/bin/env tsx
/**
 * Seed cards table from catalog JSON into Postgres.
 * Usage: pnpm --filter @stipulate/api db:seed
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, disconnectDatabase, withTransaction } from '../src/lib/db.js';
import { ISSUER_SLUG_MAP } from '@stipulate/schema';
import type { CardCatalog } from '@stipulate/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const catalogPath =
    process.argv[2] ??
    join(__dirname, '../../../packages/schema/data/cards/catalog-core50.json');

  const raw = readFileSync(catalogPath, 'utf-8');
  const catalog = JSON.parse(raw) as CardCatalog;

  console.log(`Seeding ${catalog.cards.length} cards from ${catalogPath}`);

  await withTransaction(async (client) => {
    for (const card of catalog.cards) {
      const issuerSlug = ISSUER_SLUG_MAP[card.issuer] ?? card.issuer.toLowerCase().replace(/\s+/g, '-');

      const issuerResult = await client.query<{ id: string }>(
        `INSERT INTO issuers (slug, name)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [issuerSlug, card.issuer],
      );

      const issuerId = issuerResult.rows[0]?.id;
      if (!issuerId) throw new Error(`Failed to resolve issuer: ${card.issuer}`);

      await client.query(
        `INSERT INTO cards (card_id, issuer_id, name, network, annual_fee_cents, metadata, benefit_guide_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (card_id) DO UPDATE SET
           name = EXCLUDED.name,
           network = EXCLUDED.network,
           annual_fee_cents = EXCLUDED.annual_fee_cents,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [
          card.id,
          issuerId,
          card.productName,
          card.network,
          card.annualFee?.amountMinor ?? 0,
          JSON.stringify(card.metadata ?? {}),
          card.benefitGuideUrl ?? null,
        ],
      );
    }
  });

  console.log(`Seeded ${catalog.cards.length} cards successfully.`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
