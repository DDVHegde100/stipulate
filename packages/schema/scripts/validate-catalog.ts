#!/usr/bin/env tsx
/**
 * Validate card catalog JSON files against CardCatalogSchema.
 * Usage: pnpm --filter @stipulate/schema catalog:validate [path]
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidCatalog, validateCatalogFile } from '../src/catalog-validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultPath = join(__dirname, '../data/cards/catalog-full.json');
const catalogPath = process.argv[2] ?? defaultPath;

const report = validateCatalogFile(catalogPath);

console.log(`Catalog: ${catalogPath}`);
console.log(`  Cards: ${report.cardCount}`);
console.log(`  Issuers: ${report.issuerCount}`);
console.log(`  Active: ${report.activeCount}`);
console.log(`  With benefit guide URL: ${report.withBenefitGuideCount}`);

const warnings = report.issues.filter((i) => i.level === 'warning');
if (warnings.length > 0) {
  console.warn(`  Warnings: ${warnings.length} (missing benefit guides, etc.)`);
}

assertValidCatalog(report);
console.log('Catalog validation passed.');
