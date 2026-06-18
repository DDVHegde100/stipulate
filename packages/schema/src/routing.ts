import { z } from "zod";
import {
  MetadataSchema,
  MoneySchema,
  PurchaseChannelSchema,
} from "./common.js";
import { MerchantEnrichmentSchema } from "./merchant.js";

/** Input to the card routing engine for a single purchase decision. */
export const RouteRequestSchema = z.object({
  requestId: z.string().min(1).optional(),
  merchantName: z.string().min(1).optional(),
  mcc: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  amount: MoneySchema,
  /** Card IDs the user holds and wants ranked. */
  userCardIds: z.array(z.string().min(1)).min(1),
  channel: PurchaseChannelSchema.default("unknown"),
  isInternational: z.boolean().default(false),
  /** Pre-computed enrichment to skip MCC resolution. */
  merchantEnrichment: MerchantEnrichmentSchema.optional(),
  /** Routing preferences. */
  preferences: z
    .object({
      optimizeFor: z.enum(["max_reward", "min_fees", "balanced"]).default("max_reward"),
      excludeCardIds: z.array(z.string()).default([]),
    })
    .default({ optimizeFor: "max_reward", excludeCardIds: [] }),
  metadata: MetadataSchema.optional(),
});

/** Structured explainability factor for UI tooltips. */
export const RoutingFactorSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  impactMinor: z.number().optional(),
  weight: z.number().min(0).max(1).optional(),
  category: z.enum(['multiplier', 'valuation', 'cap', 'exclusion', 'fee', 'merchant']).default('multiplier'),
});

/** A card ranked for a specific purchase with computed reward estimate. */
export const RankedCardSchema = z.object({
  cardId: z.string().min(1),
  rank: z.number().int().positive(),
  score: z.number(),
  effectiveMultiplier: z.number().nonnegative(),
  estimatedReward: MoneySchema,
  applicableRuleIds: z.array(z.string()),
  excludedBy: z
    .array(
      z.object({
        exclusionId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  fees: z
    .object({
      foreignTransactionFee: MoneySchema.optional(),
    })
    .optional(),
  reasoning: z.string().optional(),
  factors: z.array(RoutingFactorSchema).default([]),
});

/** Output from the routing engine with ranked recommendations. */
export const RouteResponseSchema = z.object({
  requestId: z.string().min(1),
  rankedCards: z.array(RankedCardSchema).min(1),
  merchantEnrichment: MerchantEnrichmentSchema.optional(),
  bestCardId: z.string().min(1),
  computedAt: z.string().datetime({ offset: true }),
  warnings: z.array(z.string()).default([]),
  metadata: MetadataSchema.optional(),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;
export type RoutingFactor = z.infer<typeof RoutingFactorSchema>;
export type RankedCard = z.infer<typeof RankedCardSchema>;
export type RouteResponse = z.infer<typeof RouteResponseSchema>;

/** Batch routing request — up to 100 transactions per call. */
export const BatchRouteRequestSchema = z.object({
  requests: z.array(RouteRequestSchema).min(1).max(100),
  sharedUserCardIds: z.array(z.string().min(1)).optional(),
});

/** Batch routing response with per-request results. */
export const BatchRouteResponseSchema = z.object({
  batchId: z.string().min(1),
  results: z.array(RouteResponseSchema),
  total: z.number().int().positive(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z
    .array(z.object({ index: z.number().int(), message: z.string() }))
    .default([]),
  computedAt: z.string().datetime({ offset: true }),
});

export type BatchRouteRequest = z.infer<typeof BatchRouteRequestSchema>;
export type BatchRouteResponse = z.infer<typeof BatchRouteResponseSchema>;

/** Sort ranked cards by rank ascending (best first). */
export function sortRankedCards(cards: RankedCard[]): RankedCard[] {
  return [...cards].sort((a, b) => a.rank - b.rank);
}

/** Extract the top-ranked card from a response. */
export function getBestCard(response: RouteResponse): RankedCard | undefined {
  return sortRankedCards(response.rankedCards)[0];
}

/** Validate that route response bestCardId matches the top-ranked entry. */
export function validateRouteResponseConsistency(response: RouteResponse): boolean {
  const best = getBestCard(response);
  return best !== undefined && best.cardId === response.bestCardId;
}
