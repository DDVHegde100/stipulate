import { describe, it, expect } from 'vitest';
import {
  parseMerchantListExclusions,
  applyIssuerDiningExclusions,
  disambiguateDiningMerchant,
  normalizeBenefitExclusions,
  isTransactionExcluded,
  extractExclusionsFromText,
} from '../exclusions.js';

describe('merchant list exclusions', () => {
  it('parses comma-separated merchant exclusions', () => {
    const exclusions = parseMerchantListExclusions(
      'Excludes purchases at Costco, Sam\'s Club, and Walmart.',
    );
    expect(exclusions.length).toBeGreaterThanOrEqual(2);
    expect(exclusions.some((e) => e.matcher.includes('costco'))).toBe(true);
  });

  it('detects fast food exclusion phrase', () => {
    const exclusions = extractExclusionsFromText(['Fast food establishments are excluded.']);
    expect(exclusions.some((e) => e.matcher.includes('fast food'))).toBe(true);
  });
});

describe('issuer dining exclusion policies', () => {
  it('adds fast food exclusions for amex dining', () => {
    const exclusions = applyIssuerDiningExclusions('amex', 'dining');
    expect(exclusions.length).toBeGreaterThan(0);
    expect(exclusions.some((e) => e.matcher.includes('mcdonald'))).toBe(true);
  });

  it('skips fast food exclusions for chase dining', () => {
    const exclusions = applyIssuerDiningExclusions('chase', 'dining');
    expect(exclusions).toHaveLength(0);
  });

  it('identifies fast food merchants', () => {
    expect(disambiguateDiningMerchant("McDonald's")).toBe('fast_food');
    expect(disambiguateDiningMerchant('The Capital Grille')).toBe('full_service');
  });
});

describe('normalizeBenefitExclusions with issuer', () => {
  it('applies issuer policy to dining benefits', () => {
    const { benefits, notes } = normalizeBenefitExclusions(
      [
        {
          name: 'Dining',
          description: '4x at restaurants',
          category: 'dining',
          multiplier: 4,
          rewardType: 'points',
          caps: [],
          exclusions: [],
          requiresActivation: false,
        },
      ],
      { issuer: 'amex' },
    );
    expect(benefits).toHaveLength(1);
    expect(notes.some((n) => n.includes('issuer dining exclusions'))).toBe(true);
  });

  it('checks transaction against exclusions', () => {
    const exclusions = applyIssuerDiningExclusions('amex', 'dining');
    expect(isTransactionExcluded(exclusions, 'taco bell')).toBeDefined();
    expect(isTransactionExcluded(exclusions, 'fine dining bistro')).toBeUndefined();
  });
});
