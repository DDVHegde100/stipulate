#!/usr/bin/env tsx
/**
 * Expand base card catalog to 200+ entries and write catalog-full.json
 * Usage: pnpm --filter @stipulate/schema generate:catalog
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import {
  buildCatalog,
  expandCatalogEntries,
  type CardSeedEntry,
} from '../src/catalog-seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../data/cards');

const baseEntries = JSON.parse(
  readFileSync(join(dataDir, 'base-cards.json'), 'utf-8'),
) as CardSeedEntry[];

const expanded = expandCatalogEntries(baseEntries, 210);
const catalog = buildCatalog('2026.02.06-full', expanded);

writeFileSync(join(dataDir, 'catalog-full.json'), JSON.stringify(catalog, null, 2));

const core50 = buildCatalog('2026.02.05-core50', baseEntries.slice(0, 50));
writeFileSync(join(dataDir, 'catalog-core50.json'), JSON.stringify(core50, null, 2));

console.log(`Generated catalog-core50.json (${core50.cards.length} cards)`);
console.log(`Generated catalog-full.json (${catalog.cards.length} cards)`);
