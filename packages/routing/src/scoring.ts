import type { BenefitRule, Money, PointsValuationTable } from '@stipulate/schema';
import {
  computeCashEquivalent,
  pointsToCashMinor,
} from '@stipulate/schema';

export interface ScoreBreakdown {
  multiplier: number;
  rewardMinor: number;
  cashEquivalentMinor: number;
  cpp: number;
  programId?: string;
  score: number;
  reasoning: string[];
}

/** Score a single benefit rule for a transaction amount. */
export function scoreBenefitRule(
  rule: BenefitRule,
  cardId: string,
  amount: Money,
  rewardMinor: number,
  valuation: PointsValuationTable,
  conservative = true,
): ScoreBreakdown {
  const reasoning: string[] = [];

  if (rule.rewardType === 'cashback') {
    const cashEquivalentMinor = rewardMinor;
    reasoning.push(`${rule.multiplier * 100}% cashback = $${(cashEquivalentMinor / 100).toFixed(2)}`);
    return {
      multiplier: rule.multiplier,
      rewardMinor: cashEquivalentMinor,
      cashEquivalentMinor,
      cpp: 1,
      score: cashEquivalentMinor,
      reasoning,
    };
  }

  const pointsEarned = Math.round((amount.amountMinor / 100) * rule.multiplier);
  const { cashEquivalentMinor, cpp, programId } = computeCashEquivalent(
    valuation,
    cardId,
    pointsEarned,
    conservative,
  );

  reasoning.push(
    `${rule.multiplier}x ${rule.rewardType} = ${pointsEarned} pts @ ${cpp}cpp = $${(cashEquivalentMinor / 100).toFixed(2)}`,
  );

  return {
    multiplier: rule.multiplier,
    rewardMinor: pointsEarned,
    cashEquivalentMinor,
    cpp,
    programId,
    score: cashEquivalentMinor,
    reasoning,
  };
}

/** Compare two scores — higher cash equivalent wins. */
export function compareScores(a: ScoreBreakdown, b: ScoreBreakdown): number {
  return b.score - a.score;
}

/** Apply foreign transaction fee penalty for international purchases. */
export function applyForeignTransactionFee(
  score: ScoreBreakdown,
  amount: Money,
  feeRate = 0.03,
): ScoreBreakdown {
  const feeMinor = Math.round(amount.amountMinor * feeRate);
  const adjusted = score.cashEquivalentMinor - feeMinor;
  return {
    ...score,
    cashEquivalentMinor: adjusted,
    score: adjusted,
    reasoning: [
      ...score.reasoning,
      `Foreign transaction fee (${feeRate * 100}%): -$${(feeMinor / 100).toFixed(2)}`,
    ],
  };
}

/** Quick score for miles without full valuation table. */
export function scoreMilesFallback(rule: BenefitRule, amount: Money): number {
  const miles = Math.round((amount.amountMinor / 100) * rule.multiplier);
  return pointsToCashMinor(miles, 1.0);
}
