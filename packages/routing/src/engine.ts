import type {
  BenefitRule,
  PointsValuationTable,
  RankedCard,
  RouteRequest,
  RouteResponse,
  SpendingCategory,
} from '@stipulate/schema';
import { RouteResponseSchema } from '@stipulate/schema';
import { resolveMerchant } from '@stipulate/mcc';
import { evaluateCaps, emptyCapContext, type CapSpendContext } from './caps.js';
import {
  checkRuleExclusions,
  findMatchingRule,
  meetsMinSpend,
  resolveSpendCategory,
} from './exclusions.js';
import { applyForeignTransactionFee, scoreBenefitRule } from './scoring.js';

export const ROUTING_MODEL_VERSION = 'routing-engine-1.0.0';

export interface CardBenefitBundle {
  cardId: string;
  rules: BenefitRule[];
}

export interface RouteEngineOptions {
  valuation: PointsValuationTable;
  capContext?: CapSpendContext;
  conservativeValuation?: boolean;
  foreignTransactionFeeRate?: number;
}

/** Core routing engine — ranks cards by cash-equivalent reward for a purchase. */
export function routeTransaction(
  request: RouteRequest,
  bundles: CardBenefitBundle[],
  options: RouteEngineOptions,
  requestId: string,
): RouteResponse {
  const warnings: string[] = [];
  const capContext = options.capContext ?? emptyCapContext();

  let enrichment = request.merchantEnrichment;
  if (!enrichment && request.merchantName) {
    enrichment = resolveMerchant(request.merchantName, { mcc: request.mcc });
  }

  const category: SpendingCategory = enrichment
    ? resolveSpendCategory(enrichment)
    : 'other';

  const merchantName = enrichment?.merchantName ?? request.merchantName ?? 'unknown';
  const mcc = enrichment?.mcc ?? request.mcc;

  if (enrichment && enrichment.confidence < 0.6) {
    warnings.push(`Low merchant confidence (${enrichment.confidence.toFixed(2)}) — routing may be suboptimal`);
  }

  const eligibleBundles = bundles.filter(
    (b) => !request.preferences.excludeCardIds.includes(b.cardId) &&
      request.userCardIds.includes(b.cardId),
  );

  if (eligibleBundles.length === 0) {
    throw new Error('No eligible cards in wallet for routing');
  }

  const ranked: RankedCard[] = [];

  for (const bundle of eligibleBundles) {
    const match = findMatchingRule(bundle.rules, category, merchantName, mcc);

    if (!match) {
      warnings.push(`No eligible rule for ${bundle.cardId} on ${category}`);
      continue;
    }

    const { rule } = match;

    if (!meetsMinSpend(rule, request.amount)) {
      warnings.push(`${bundle.cardId}: below minimum spend for ${rule.name}`);
      continue;
    }

    const capEval = evaluateCaps(rule, request.amount, capContext);
    if (capEval.exhausted) {
      ranked.push({
        cardId: bundle.cardId,
        rank: 0,
        score: 0,
        effectiveMultiplier: 0,
        estimatedReward: { amountMinor: 0, currency: request.amount.currency },
        applicableRuleIds: [rule.id],
        excludedBy: capEval.capApplied
          ? [{ exclusionId: capEval.capApplied.id, reason: 'Cap exhausted for period' }]
          : undefined,
        reasoning: capEval.reasoning.join('; '),
      });
      continue;
    }

    let scoreResult = scoreBenefitRule(
      rule,
      bundle.cardId,
      request.amount,
      capEval.rewardMinor,
      options.valuation,
      options.conservativeValuation ?? true,
    );

    if (request.isInternational && options.foreignTransactionFeeRate) {
      scoreResult = applyForeignTransactionFee(
        scoreResult,
        request.amount,
        options.foreignTransactionFeeRate,
      );
    }

    const excludedHits = bundle.rules
      .filter((r) => r.id !== rule.id)
      .flatMap((r) => {
        const ex = checkRuleExclusions(r, merchantName, mcc, category);
        return ex.excluded && ex.exclusion
          ? [{ exclusionId: ex.exclusion.id, reason: ex.reason }]
          : [];
      });

    ranked.push({
      cardId: bundle.cardId,
      rank: 0,
      score: scoreResult.score,
      effectiveMultiplier: rule.multiplier,
      estimatedReward: {
        amountMinor: scoreResult.cashEquivalentMinor,
        currency: request.amount.currency,
      },
      applicableRuleIds: [rule.id],
      excludedBy: excludedHits.length > 0 ? excludedHits : undefined,
      reasoning: [...scoreResult.reasoning, ...capEval.reasoning].join('; '),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((card, index) => {
    card.rank = index + 1;
  });

  if (ranked.length === 0) {
    throw new Error('No cards could be ranked for this transaction');
  }

  const response = RouteResponseSchema.parse({
    requestId,
    rankedCards: ranked,
    merchantEnrichment: enrichment,
    bestCardId: ranked[0]!.cardId,
    computedAt: new Date().toISOString(),
    warnings,
    metadata: { modelVersion: ROUTING_MODEL_VERSION, ...request.metadata },
  });

  return response;
}

/** Batch route multiple transactions. */
export function routeBatch(
  requests: RouteRequest[],
  bundles: CardBenefitBundle[],
  options: RouteEngineOptions,
  requestIdPrefix: string,
): RouteResponse[] {
  return requests.map((req, i) =>
    routeTransaction(req, bundles, options, req.requestId ?? `${requestIdPrefix}-${i}`),
  );
}
