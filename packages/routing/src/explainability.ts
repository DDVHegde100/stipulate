import type { RoutingFactor } from '@stipulate/schema';
import type { ScoreBreakdown } from './scoring.js';
import type { CapEvaluation } from './caps.js';

/** Build structured routing factors from score and cap breakdowns. */
export function buildRoutingFactors(
  score: ScoreBreakdown,
  capEval: CapEvaluation,
  ruleName: string,
): RoutingFactor[] {
  const factors: RoutingFactor[] = [
    {
      id: 'multiplier',
      label: `${ruleName} earn rate`,
      value: `${score.multiplier}x`,
      category: 'multiplier',
      weight: 0.4,
    },
  ];

  if (score.programId) {
    factors.push({
      id: 'cpp',
      label: 'Points valuation (CPP)',
      value: score.cpp,
      category: 'valuation',
      weight: 0.25,
    });
  }

  factors.push({
    id: 'cash_equivalent',
    label: 'Estimated cash value',
    value: `$${(score.cashEquivalentMinor / 100).toFixed(2)}`,
    impactMinor: score.cashEquivalentMinor,
    category: 'valuation',
    weight: 0.35,
  });

  if (capEval.capped) {
    factors.push({
      id: 'cap_applied',
      label: 'Cap limit applied',
      value: capEval.capApplied?.description ?? capEval.capApplied?.period ?? 'cap',
      impactMinor: capEval.rewardMinor - score.cashEquivalentMinor,
      category: 'cap',
      weight: 0.3,
    });
  }

  if (capEval.exhausted) {
    factors.push({
      id: 'cap_exhausted',
      label: 'Category cap exhausted',
      value: 0,
      impactMinor: 0,
      category: 'cap',
      weight: 1,
    });
  }

  return factors;
}
