import {
  RouteRequestSchema,
  BatchRouteRequestSchema,
  PointsValuationTableSchema,
  type RouteRequest,
  type RouteResponse,
  type BatchRouteRequest,
  type BatchRouteResponse,
  type PointsValuationTable,
} from '@stipulate/schema';
import {
  routeTransaction,
  buildCapContext,
  DEFAULT_VALUATION_TABLE,
  DEMO_CARD_BUNDLES,
  ROUTING_MODEL_VERSION,
  type CardBenefitBundle,
} from '@stipulate/routing';
import { resolveMerchant } from '@stipulate/mcc';
import * as valuationRepo from '../repositories/valuation.repository.js';
import * as spendRepo from '../repositories/spend.repository.js';
import * as routingRepo from '../repositories/routing.repository.js';
import {
  getCachedBenefitIndex,
  setCachedBenefitIndex,
} from '../cache/routing-cache.js';
import {
  getDemoFallbackBundles,
  loadCardBundlesFromDb,
} from './benefit-bundle.loader.js';

export class RoutingServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_REQUEST' | 'NO_CARDS' | 'ROUTING_FAILED' | 'INTERNAL',
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RoutingServiceError';
  }
}

export { RouteRequestSchema, BatchRouteRequestSchema };

/** Load benefit rules for requested cards from cache, DB, or demo fallback. */
async function loadCardBundles(cardIds: string[]): Promise<CardBenefitBundle[]> {
  if (process.env.NODE_ENV === 'test') {
    return cardIds
      .map((id) => DEMO_CARD_BUNDLES.find((b) => b.cardId === id))
      .filter((b): b is CardBenefitBundle => b !== undefined);
  }

  const cached = await getCachedBenefitIndex<CardBenefitBundle[]>(cardIds);
  if (cached) return cached;

  let bundles: CardBenefitBundle[] = [];

  try {
    bundles = await loadCardBundlesFromDb(cardIds);
  } catch {
    bundles = [];
  }

  if (bundles.length === 0 && process.env.NODE_ENV === 'development') {
    bundles = getDemoFallbackBundles(cardIds);
  }

  if (bundles.length > 0) {
    await setCachedBenefitIndex(cardIds, bundles);
  }

  return bundles;
}

/** Load valuation table from DB or use defaults. */
async function loadValuationTable(orgId?: string): Promise<PointsValuationTable> {
  try {
    const [rows, overrideMap] = await Promise.all([
      valuationRepo.loadValuationPrograms(),
      valuationRepo.loadOverrideMap(orgId),
    ]);
    if (rows.length === 0) return DEFAULT_VALUATION_TABLE;

    return PointsValuationTableSchema.parse({
      version: 'db-snapshot',
      updatedAt: new Date().toISOString(),
      defaultCpp: 1.0,
      programs: rows.map((r) => ({
        id: r.program_id,
        name: r.name,
        issuer: r.issuer,
        centsPerPoint: overrideMap.get(r.program_id) ?? parseFloat(r.cents_per_point),
        floorCpp: r.floor_cpp ? parseFloat(r.floor_cpp) : undefined,
        ceilingCpp: r.ceiling_cpp ? parseFloat(r.ceiling_cpp) : undefined,
        transferPartners: [],
      })),
    });
  } catch {
    return DEFAULT_VALUATION_TABLE;
  }
}

export async function routePurchase(
  request: RouteRequest,
  requestId: string,
  context: { orgId?: string } = {},
): Promise<RouteResponse> {
  const start = Date.now();
  const parsed = RouteRequestSchema.safeParse(request);

  if (!parsed.success) {
    throw new RoutingServiceError('Invalid route request', 'INVALID_REQUEST', {
      issues: parsed.error.flatten(),
    });
  }

  const payload = parsed.data;

  if (payload.userCardIds.length === 0) {
    throw new RoutingServiceError('At least one card id is required', 'NO_CARDS');
  }

  try {
    const [bundles, valuation] = await Promise.all([
      loadCardBundles(payload.userCardIds),
      loadValuationTable(context.orgId),
    ]);

    if (bundles.length === 0) {
      throw new RoutingServiceError('No benefit data found for requested cards', 'NO_CARDS');
    }

    let spendRecords: Array<{ category: string; spentMinor: number }> = [];
    try {
      const rows = await spendRepo.getUserCategorySpend({
        orgId: context.orgId,
        userRef: payload.userRef,
        cardIds: payload.userCardIds,
        periodStart: spendRepo.annualPeriodStart(),
      });
      spendRecords = rows.map((r) => ({
        category: r.category,
        spentMinor: r.spent_cents,
      }));
    } catch {
      // spend tracking optional when DB unavailable
    }

    const capContext = buildCapContext(
      spendRecords.map((r) => ({ category: r.category, spentMinor: r.spentMinor })),
    );

    const response = routeTransaction(
      payload,
      bundles,
      {
        valuation,
        capContext,
        conservativeValuation: payload.preferences.optimizeFor !== 'max_reward',
        foreignTransactionFeeRate: payload.isInternational ? 0.03 : undefined,
      },
      requestId,
    );

    const latencyMs = Date.now() - start;

    if (payload.trackSpend && process.env.NODE_ENV !== 'test') {
      const category = response.merchantEnrichment?.category ?? 'other';
      void spendRepo.recordCategorySpend({
        orgId: context.orgId,
        userRef: payload.userRef,
        cardId: response.bestCardId,
        category,
        capPeriod: 'annual',
        periodStart: spendRepo.annualPeriodStart(),
        spentCents: payload.amount.amountMinor,
      }).catch(() => {});
    }

    if (process.env.NODE_ENV !== 'test') {
      routingRepo.logRoutingRequest({
      requestId,
      mcc: response.merchantEnrichment?.mcc ?? payload.mcc,
      amountCents: payload.amount.amountMinor,
      cardCount: payload.userCardIds.length,
      latencyMs,
      bestCardId: response.bestCardId,
      merchantName: response.merchantEnrichment?.merchantName ?? payload.merchantName,
      category: response.merchantEnrichment?.category,
      }).catch(() => {});
    }

    return {
      ...response,
      metadata: {
        ...response.metadata,
        modelVersion: ROUTING_MODEL_VERSION,
        latencyMs,
      },
    };
  } catch (error) {
    if (error instanceof RoutingServiceError) throw error;
    throw new RoutingServiceError(
      error instanceof Error ? error.message : 'Routing failed',
      'ROUTING_FAILED',
    );
  }
}

/** Resolve merchant enrichment for route pre-processing. */
export async function enrichForRoute(
  merchantName: string,
  mcc?: string,
): Promise<ReturnType<typeof resolveMerchant>> {
  return resolveMerchant(merchantName, { mcc });
}

/** Batch route up to 100 transactions with shared card bundle loading. */
export async function routeBatchPurchases(
  request: BatchRouteRequest,
  requestId: string,
): Promise<BatchRouteResponse> {
  const parsed = BatchRouteRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new RoutingServiceError('Invalid batch route request', 'INVALID_REQUEST', {
      issues: parsed.error.flatten(),
    });
  }

  const batchId = `batch-${requestId}`;
  const requests = parsed.data.requests.map((req) => {
    if (parsed.data.sharedUserCardIds && req.userCardIds.length === 0) {
      return { ...req, userCardIds: parsed.data.sharedUserCardIds };
    }
    return req;
  });

  const allCardIds = [...new Set(requests.flatMap((r) => r.userCardIds))];
  if (allCardIds.length === 0) {
    throw new RoutingServiceError('At least one card id is required', 'NO_CARDS');
  }

  const start = Date.now();
  const errors: Array<{ index: number; message: string }> = [];
  const results: RouteResponse[] = [];

  try {
    const [bundles, valuation] = await Promise.all([
      loadCardBundles(allCardIds),
      loadValuationTable(),
    ]);

    if (bundles.length === 0) {
      throw new RoutingServiceError('No benefit data found for requested cards', 'NO_CARDS');
    }

    let spendRecords: Array<{ category: string; spentMinor: number }> = [];
    try {
      const rows = await spendRepo.getUserCategorySpend({
        cardIds: allCardIds,
        periodStart: spendRepo.annualPeriodStart(),
      });
      spendRecords = rows.map((r) => ({
        category: r.category,
        spentMinor: r.spent_cents,
      }));
    } catch {
      // optional
    }

    const capContext = buildCapContext(
      spendRecords.map((r) => ({ category: r.category, spentMinor: r.spentMinor })),
    );

    const engineOptions = {
      valuation,
      capContext,
      conservativeValuation: true,
    };

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]!;
      try {
        const response = routeTransaction(
          req,
          bundles.filter((b) => req.userCardIds.includes(b.cardId)),
          {
            ...engineOptions,
            conservativeValuation: req.preferences.optimizeFor !== 'max_reward',
            foreignTransactionFeeRate: req.isInternational ? 0.03 : undefined,
          },
          req.requestId ?? `${batchId}-${i}`,
        );
        results.push({
          ...response,
          metadata: {
            ...response.metadata,
            modelVersion: ROUTING_MODEL_VERSION,
            batchIndex: i,
          },
        });
      } catch (error) {
        errors.push({
          index: i,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      batchId,
      results,
      total: requests.length,
      succeeded: results.length,
      failed: errors.length,
      errors,
      computedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof RoutingServiceError) throw error;
    throw new RoutingServiceError(
      error instanceof Error ? error.message : 'Batch routing failed',
      'ROUTING_FAILED',
    );
  } finally {
    if (process.env.NODE_ENV !== 'test') {
      routingRepo.logRoutingRequest({
        requestId: batchId,
        mcc: undefined,
        amountCents: 0,
        cardCount: allCardIds.length,
        latencyMs: Date.now() - start,
        bestCardId: results[0]?.bestCardId,
        merchantName: 'batch',
        category: 'batch',
      }).catch(() => {});
    }
  }
}
