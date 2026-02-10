import { describe, it, expect } from 'vitest';
import {
  categoryFromMcc,
  applyIssuerCategoryOverride,
  validateCategoryMccConsistency,
  getMccRangesByCategory,
  MCC_CATEGORY_RANGES,
} from '../mcc-categories.js';
import { normalizeCategory } from '../categories.js';

describe('MCC category normalization', () => {
  it('maps dining MCC 5812', () => {
    expect(categoryFromMcc('5812')).toBe('dining');
  });

  it('maps grocery MCC 5411', () => {
    expect(categoryFromMcc('5411')).toBe('groceries');
  });

  it('returns other for unknown MCC', () => {
    expect(categoryFromMcc('9999')).toBe('other');
  });

  it('applies amex issuer override', () => {
    expect(applyIssuerCategoryOverride('amex', 'US Restaurants')).toBe('dining');
  });

  it('applies chase issuer override', () => {
    expect(applyIssuerCategoryOverride('chase', 'Lyft')).toBe('transit');
  });

  it('detects category/MCC mismatch', () => {
    const result = validateCategoryMccConsistency('groceries', '5812');
    expect(result.consistent).toBe(false);
    expect(result.expectedCategory).toBe('dining');
  });

  it('normalizes with issuer and mcc context', () => {
    expect(normalizeCategory('US Restaurants', 'amex')).toBe('dining');
    expect(normalizeCategory('unknown category', undefined, '5411')).toBe('groceries');
  });

  it('groups MCC ranges by category', () => {
    const grouped = getMccRangesByCategory();
    expect(grouped.get('dining')?.length).toBeGreaterThan(0);
  });

  it('has at least 15 MCC range mappings', () => {
    expect(MCC_CATEGORY_RANGES.length).toBeGreaterThanOrEqual(15);
  });
});
