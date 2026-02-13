import type { BenefitCap, BenefitRule, Money } from '@stipulate/schema';
import { computeCappedReward } from '@stipulate/schema';

export interface CapSpendContext {
  /** Prior spend in current cap period, keyed by cap id. */
  priorSpendByCapId: Record<string, number>;
  /** Prior spend by category for rules without explicit cap ids. */
  priorSpendByCategory: Record<string, number>;
}

export interface CapEvaluation {
  rewardMinor: number;
  capped: boolean;
  exhausted: boolean;
  capApplied?: BenefitCap;
  remainingCapMinor?: number;
  reasoning: string[];
}

/** Evaluate cap constraints for a benefit rule and transaction. */
export function evaluateCaps(
  rule: BenefitRule,
  amount: Money,
  context: CapSpendContext,
): CapEvaluation {
  const reasoning: string[] = [];

  if (rule.caps.length === 0) {
    const rewardMinor = computeCappedReward(rule, amount, 0);
    return {
      rewardMinor,
      capped: false,
      exhausted: false,
      reasoning: ['No cap on this benefit'],
    };
  }

  let mostRestrictiveCap: BenefitCap | undefined;
  let lowestRemaining = Infinity;

  for (const cap of rule.caps) {
    const prior =
      context.priorSpendByCapId[cap.id] ??
      context.priorSpendByCategory[rule.category] ??
      0;
    const remaining = cap.limit.amountMinor - prior;

    if (remaining <= 0) {
      reasoning.push(`Cap exhausted: ${cap.description ?? cap.period} ($${(cap.limit.amountMinor / 100).toFixed(0)} ${cap.period})`);
      return {
        rewardMinor: 0,
        capped: true,
        exhausted: true,
        capApplied: cap,
        remainingCapMinor: 0,
        reasoning,
      };
    }

    if (remaining < lowestRemaining) {
      lowestRemaining = remaining;
      mostRestrictiveCap = cap;
    }
  }

  const primaryCap = mostRestrictiveCap ?? rule.caps[0]!;
  const prior =
    context.priorSpendByCapId[primaryCap.id] ??
    context.priorSpendByCategory[rule.category] ??
    0;

  const rewardMinor = computeCappedReward(rule, amount, prior);
  const uncappedReward = computeCappedReward(rule, amount, 0);
  const capped = rewardMinor < uncappedReward;

  if (capped) {
    reasoning.push(
      `Cap applied: ${primaryCap.description ?? primaryCap.period} — reward limited to $${(rewardMinor / 100).toFixed(2)}`,
    );
  } else {
    reasoning.push(`Within cap: $${(lowestRemaining / 100).toFixed(0)} remaining this ${primaryCap.period}`);
  }

  return {
    rewardMinor,
    capped,
    exhausted: false,
    capApplied: capped ? primaryCap : undefined,
    remainingCapMinor: lowestRemaining,
    reasoning,
  };
}

/** Build default empty cap context. */
export function emptyCapContext(): CapSpendContext {
  return { priorSpendByCapId: {}, priorSpendByCategory: {} };
}

/** Merge spend records into cap context. */
export function buildCapContext(
  records: Array<{ capId?: string; category: string; spentMinor: number }>,
): CapSpendContext {
  const priorSpendByCapId: Record<string, number> = {};
  const priorSpendByCategory: Record<string, number> = {};

  for (const record of records) {
    if (record.capId) {
      priorSpendByCapId[record.capId] = (priorSpendByCapId[record.capId] ?? 0) + record.spentMinor;
    }
    priorSpendByCategory[record.category] =
      (priorSpendByCategory[record.category] ?? 0) + record.spentMinor;
  }

  return { priorSpendByCapId, priorSpendByCategory };
}
