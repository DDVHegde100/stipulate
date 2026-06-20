import { describe, expect, it } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCatalogFile } from '../catalog-validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fullCatalogPath = join(__dirname, '../../data/cards/catalog-full.json');
const core50Path = join(__dirname, '../../data/cards/catalog-core50.json');

describe('validateCatalogFile', () => {
  it('validates catalog-full.json', () => {
    const report = validateCatalogFile(fullCatalogPath);
    expect(report.valid).toBe(true);
    expect(report.cardCount).toBeGreaterThanOrEqual(200);
    expect(report.duplicateIds).toHaveLength(0);
  });

  it('validates catalog-core50.json', () => {
    const report = validateCatalogFile(core50Path);
    expect(report.valid).toBe(true);
    expect(report.cardCount).toBe(50);
  });
});
