import { describe, it, expect } from 'vitest';
import {
  routeTransaction,
  evaluateCaps,
  buildCapContext,
  checkRuleExclusions,
  findMatchingRule,
  DEFAULT_VALUATION_TABLE,
  DEMO_CARD_BUNDLES,
} from '../index.js';
import { RouteRequestSchema } from '@stipulate/schema';

describe('routing engine core', () => {
  const baseRequest = RouteRequestSchema.parse({
    merchantName: 'Blue Bottle Coffee',
    mcc: '5812',
    amount: { amountMinor: 1200, currency: 'USD' },
    userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
    channel: 'in_store',
  });

  it('ranks dining purchase with amex gold first at 4x', () => {
    const response = routeTransaction(
      baseRequest,
      DEMO_CARD_BUNDLES,
      { valuation: DEFAULT_VALUATION_TABLE },
      'req-1',
    );

    expect(response.bestCardId).toBe('amex_gold');
    expect(response.rankedCards[0]!.score).toBeGreaterThan(response.rankedCards[1]!.score);
    expect(response.rankedCards[0]!.effectiveMultiplier).toBe(4);
  });

  it('ranks travel purchase with chase sapphire preferred', () => {
    const request = RouteRequestSchema.parse({
      ...baseRequest,
      merchantName: 'Delta Air Lines',
      mcc: '4511',
    });

    const response = routeTransaction(
      request,
      DEMO_CARD_BUNDLES,
      { valuation: DEFAULT_VALUATION_TABLE },
      'req-2',
    );

    expect(response.rankedCards.some((c) => c.cardId === 'chase_sapphire_preferred')).toBe(true);
    expect(response.merchantEnrichment?.category).toBeDefined();
  });

  it('applies cap when grocery spend exceeds annual limit', () => {
    const capContext = buildCapContext([
      { category: 'groceries', spentMinor: 2_500_000 },
    ]);

    const request = RouteRequestSchema.parse({
      merchantName: 'Whole Foods Market',
      mcc: '5411',
      amount: { amountMinor: 5000, currency: 'USD' },
      userCardIds: ['amex_gold'],
    });

    const response = routeTransaction(
      request,
      DEMO_CARD_BUNDLES,
      { valuation: DEFAULT_VALUATION_TABLE, capContext },
      'req-3',
    );

    const amex = response.rankedCards.find((c) => c.cardId === 'amex_gold');
    expect(amex?.score).toBe(0);
    expect(amex?.reasoning).toContain('Cap exhausted');
  });
});

describe('exclusion engine', () => {
  it('excludes fast food from amex dining rule', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const diningRule = bundle.rules.find((r) => r.category === 'dining')!;
    const result = checkRuleExclusions(diningRule, "McDonald's", '5814', 'dining');
    expect(result.excluded).toBe(true);
  });

  it('finds dining rule for full-service restaurant', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const match = findMatchingRule(bundle.rules, 'dining', 'The French Laundry', '5812');
    expect(match?.rule.multiplier).toBe(4);
  });
});

describe('cap evaluation', () => {
  it('returns zero reward when cap exhausted', () => {
    const bundle = DEMO_CARD_BUNDLES.find((b) => b.cardId === 'amex_gold')!;
    const rule = bundle.rules.find((r) => r.category === 'groceries')!;
    const eval_ = evaluateCaps(
      rule,
      { amountMinor: 1000, currency: 'USD' },
      buildCapContext([{ category: 'groceries', spentMinor: 2_600_000 }]),
    );
    expect(eval_.exhausted).toBe(true);
    expect(eval_.rewardMinor).toBe(0);
  });
});

describe('routing scenarios', () => {
  const scenarios = [
    { name: 'coffee shop', merchant: 'Starbucks', mcc: '5814', expectWinner: 'amex_gold' },
    { name: 'grocery store', merchant: 'Kroger', mcc: '5411', expectWinner: 'amex_gold' },
    { name: 'airline', merchant: 'Delta Air Lines', mcc: '4511', expectWinner: 'chase_sapphire_preferred' },
  ];

  for (const scenario of scenarios) {
    it(`routes ${scenario.name} optimally`, () => {
      const request = RouteRequestSchema.parse({
        merchantName: scenario.merchant,
        mcc: scenario.mcc,
        amount: { amountMinor: 5000, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
      });

      const response = routeTransaction(
        request,
        DEMO_CARD_BUNDLES,
        { valuation: DEFAULT_VALUATION_TABLE },
        `scenario-${scenario.name}`,
      );

      expect(response.bestCardId).toBe(scenario.expectWinner);
    });
  }
});
