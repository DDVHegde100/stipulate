import { describe, it, expect } from 'vitest';
import { routeTransaction, DEFAULT_VALUATION_TABLE, DEMO_CARD_BUNDLES } from '../index.js';
import { generateRoutingScenarios } from '../fixtures/scenarios.js';

describe('500-scenario routing regression', () => {
  const scenarios = generateRoutingScenarios(500);

  it('generates 500 diverse scenarios', () => {
    expect(scenarios).toHaveLength(500);
    expect(new Set(scenarios.map((s) => s.request.merchantName)).size).toBeGreaterThan(10);
  });

  it('routes all 500 scenarios without error', () => {
    let succeeded = 0;
    const errors: string[] = [];

    for (const scenario of scenarios) {
      try {
        const response = routeTransaction(
          scenario.request,
          DEMO_CARD_BUNDLES.filter((b) => scenario.request.userCardIds.includes(b.cardId)),
          { valuation: DEFAULT_VALUATION_TABLE },
          scenario.id,
        );
        expect(response.bestCardId).toBeTruthy();
        expect(response.rankedCards.length).toBeGreaterThan(0);
        succeeded++;
      } catch (error) {
        errors.push(`${scenario.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    expect(errors).toHaveLength(0);
    expect(succeeded).toBe(500);
  });

  it('returns explainability factors on every ranked card', () => {
    const sample = scenarios.slice(0, 50);
    for (const scenario of sample) {
      const response = routeTransaction(
        scenario.request,
        DEMO_CARD_BUNDLES.filter((b) => scenario.request.userCardIds.includes(b.cardId)),
        { valuation: DEFAULT_VALUATION_TABLE },
        scenario.id,
      );
      for (const card of response.rankedCards) {
        expect(card.factors.length).toBeGreaterThan(0);
      }
    }
  });
});
