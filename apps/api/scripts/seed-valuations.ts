#!/usr/bin/env tsx
/**
 * Seed points_programs table from JSON valuation data.
 * Usage: pnpm --filter @stipulate/api db:seed-valuations
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PointsValuationTableSchema } from '@stipulate/schema';
import { withTransaction, disconnectDatabase } from '../src/lib/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  const dataPath = join(
    __dirname,
    '../../../packages/schema/data/valuations/points-programs.json',
  );
  const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const table = PointsValuationTableSchema.parse(raw);

  await withTransaction(async (client) => {
    for (const program of table.programs) {
      await client.query(
        `INSERT INTO points_programs (id, name, issuer, cents_per_point, floor_cpp, ceiling_cpp, transfer_partners, pools_across_cards)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           cents_per_point = EXCLUDED.cents_per_point,
           floor_cpp = EXCLUDED.floor_cpp,
           ceiling_cpp = EXCLUDED.ceiling_cpp,
           transfer_partners = EXCLUDED.transfer_partners,
           updated_at = NOW()`,
        [
          program.id,
          program.name,
          program.issuer,
          program.centsPerPoint,
          program.floorCpp ?? null,
          program.ceilingCpp ?? null,
          JSON.stringify(program.transferPartners),
          program.poolsAcrossCards,
        ],
      );
    }

    await client.query(
      `INSERT INTO points_valuation_snapshots (version, snapshot) VALUES ($1, $2)`,
      [table.version, JSON.stringify(table)],
    );
  });

  console.log(`Seeded ${table.programs.length} points programs (version ${table.version})`);
  await disconnectDatabase();
}

main().catch((err) => {
  console.error('Valuation seed failed:', err);
  process.exit(1);
});
