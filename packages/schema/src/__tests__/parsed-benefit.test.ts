import { describe, it, expect } from 'vitest';
import {
  ParsedBenefitSchema,
  ParsedBenefitBundleSchema,
  diffBenefitBundles,
  computeBundleConfidence,
  parsedBenefitToRuleFields,
} from '../parsed-benefit.js';

const sampleBenefit = {
  card_id: 'chase_sapphire_preferred',
  category: 'dining' as const,
  multiplier: 3,
  cap: 25000,
  cap_period: 'annual' as const,
  exclusions: ['fast food'],
  effective_date: '2026-01-01',
  source_url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
  confidence: 0.92,
  reward_type: 'points' as const,
};

describe('ParsedBenefitSchema', () => {
  it('parses a valid parsed benefit', () => {
    const result = ParsedBenefitSchema.safeParse(sampleBenefit);
    expect(result.success).toBe(true);
  });

  it('rejects invalid card_id format', () => {
    const result = ParsedBenefitSchema.safeParse({ ...sampleBenefit, card_id: 'Chase-Sapphire' });
    expect(result.success).toBe(false);
  });

  it('converts to rule fields', () => {
    const parsed = ParsedBenefitSchema.parse(sampleBenefit);
    const fields = parsedBenefitToRuleFields(parsed);
    expect(fields.multiplier).toBe(3);
    expect(fields.exclusions).toHaveLength(1);
    expect(fields.exclusions[0]?.matcher).toBe('fast food');
  });
});

describe('ParsedBenefitBundleSchema', () => {
  it('computes bundle confidence', () => {
    const benefits = [
      ParsedBenefitSchema.parse(sampleBenefit),
      ParsedBenefitSchema.parse({ ...sampleBenefit, category: 'travel', confidence: 0.88 }),
    ];
    expect(computeBundleConfidence(benefits)).toBe(0.9);
  });
});

describe('diffBenefitBundles', () => {
  const baseBundle = ParsedBenefitBundleSchema.parse({
    card_id: 'chase_sapphire_preferred',
    version: 1,
    parsed_at: '2026-01-01T00:00:00.000Z',
    source_url: sampleBenefit.source_url,
    content_hash: 'abc12345',
    benefits: [sampleBenefit],
    average_confidence: 0.92,
  });

  it('detects multiplier changes as breaking', () => {
    const newBundle = ParsedBenefitBundleSchema.parse({
      ...baseBundle,
      version: 2,
      benefits: [{ ...sampleBenefit, multiplier: 2 }],
    });
    const changes = diffBenefitBundles(baseBundle, newBundle);
    expect(changes.some((c) => c.field === 'multiplier' && c.severity === 'breaking')).toBe(true);
  });

  it('detects new categories', () => {
    const newBundle = ParsedBenefitBundleSchema.parse({
      ...baseBundle,
      version: 2,
      benefits: [
        sampleBenefit,
        { ...sampleBenefit, category: 'groceries', multiplier: 1 },
      ],
    });
    const changes = diffBenefitBundles(baseBundle, newBundle);
    expect(changes.some((c) => c.field === 'category_added')).toBe(true);
  });
});
