import { z } from 'zod';

/**
 * Minimal local types for the Stipulate routing domain.
 * Replace with @stipulate/schema imports when the shared package is available.
 */

export type CardNetwork = 'visa' | 'mastercard' | 'amex' | 'discover';

export type SpendCategory =
  | 'dining'
  | 'travel'
  | 'groceries'
  | 'gas'
  | 'entertainment'
  | 'shopping'
  | 'other';

export interface MerchantContext {
  merchantId?: string;
  merchantName: string;
  mcc?: string;
  category?: SpendCategory;
  location?: {
    city?: string;
    region?: string;
    country?: string;
  };
}

export interface CardContext {
  cardId?: string;
  issuer: string;
  productName: string;
  network: CardNetwork;
  lastFour?: string;
}

export interface RouteRequest {
  amount: number;
  currency: string;
  merchant: MerchantContext;
  cards: CardContext[];
  metadata?: Record<string, string>;
}

export interface BenefitMatch {
  benefitId: string;
  name: string;
  description: string;
  estimatedValue: number;
  confidence: number;
  reason: string;
}

export interface CardRouteRecommendation {
  card: CardContext;
  rank: number;
  score: number;
  effectiveRewardRate: number;
  benefits: BenefitMatch[];
  rationale: string;
}

export interface RouteResponse {
  requestId: string;
  recommended: CardRouteRecommendation | null;
  alternatives: CardRouteRecommendation[];
  evaluatedAt: string;
  modelVersion: string;
}

export interface EnrichRequest {
  merchantName: string;
  mcc?: string;
  rawDescription?: string;
  location?: MerchantContext['location'];
}

export interface EnrichedMerchant {
  merchantName: string;
  normalizedName: string;
  category: SpendCategory;
  mcc?: string;
  confidence: number;
  tags: string[];
}

export interface EnrichResponse {
  requestId: string;
  merchant: EnrichedMerchant;
  enrichedAt: string;
}

export interface RoutingService {
  route(request: RouteRequest, requestId: string): Promise<RouteResponse>;
  enrich(request: EnrichRequest, requestId: string): Promise<EnrichResponse>;
}

export class RoutingServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_REQUEST' | 'NO_CARDS' | 'INTERNAL',
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RoutingServiceError';
  }
}

const spendCategorySchema = z.enum([
  'dining',
  'travel',
  'groceries',
  'gas',
  'entertainment',
  'shopping',
  'other',
]);

const cardNetworkSchema = z.enum(['visa', 'mastercard', 'amex', 'discover']);

const merchantContextSchema = z.object({
  merchantId: z.string().min(1).optional(),
  merchantName: z.string().min(1).max(256),
  mcc: z.string().regex(/^\d{4}$/).optional(),
  category: spendCategorySchema.optional(),
  location: z
    .object({
      city: z.string().optional(),
      region: z.string().optional(),
      country: z.string().length(2).optional(),
    })
    .optional(),
});

const cardContextSchema = z.object({
  cardId: z.string().min(1).optional(),
  issuer: z.string().min(1).max(128),
  productName: z.string().min(1).max(256),
  network: cardNetworkSchema,
  lastFour: z.string().regex(/^\d{4}$/).optional(),
});

export const routeRequestSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  currency: z.string().length(3).toUpperCase(),
  merchant: merchantContextSchema,
  cards: z.array(cardContextSchema).min(1).max(20),
  metadata: z.record(z.string()).optional(),
});

export const enrichRequestSchema = z.object({
  merchantName: z.string().min(1).max(256),
  mcc: z.string().regex(/^\d{4}$/).optional(),
  rawDescription: z.string().max(512).optional(),
  location: merchantContextSchema.shape.location,
});

const CATEGORY_BY_MCC: Record<string, SpendCategory> = {
  '5812': 'dining',
  '5814': 'dining',
  '5411': 'groceries',
  '5541': 'gas',
  '5542': 'gas',
  '4511': 'travel',
  '7011': 'travel',
  '7832': 'entertainment',
  '5311': 'shopping',
};

const MODEL_VERSION = 'routing-stub-0.1.0';

export class DefaultRoutingService implements RoutingService {
  async route(request: RouteRequest, requestId: string): Promise<RouteResponse> {
    const parsed = routeRequestSchema.safeParse(request);

    if (!parsed.success) {
      throw new RoutingServiceError('Invalid route request payload', 'INVALID_REQUEST', {
        issues: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;

    if (payload.cards.length === 0) {
      throw new RoutingServiceError('At least one card is required', 'NO_CARDS');
    }

    const category = this.resolveCategory(payload.merchant);
    const recommendations = payload.cards
      .map((card, index) => this.scoreCard(card, payload.amount, category, index))
      .sort((left, right) => right.score - left.score)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    const [recommended, ...alternatives] = recommendations;

    return {
      requestId,
      recommended: recommended ?? null,
      alternatives,
      evaluatedAt: new Date().toISOString(),
      modelVersion: MODEL_VERSION,
    };
  }

  async enrich(request: EnrichRequest, requestId: string): Promise<EnrichResponse> {
    const parsed = enrichRequestSchema.safeParse(request);

    if (!parsed.success) {
      throw new RoutingServiceError('Invalid enrich request payload', 'INVALID_REQUEST', {
        issues: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const normalizedName = this.normalizeMerchantName(payload.merchantName);
    const category = payload.mcc
      ? (CATEGORY_BY_MCC[payload.mcc] ?? 'other')
      : this.inferCategoryFromName(normalizedName);

    return {
      requestId,
      merchant: {
        merchantName: payload.merchantName,
        normalizedName,
        category,
        mcc: payload.mcc,
        confidence: payload.mcc ? 0.92 : 0.74,
        tags: this.buildMerchantTags(normalizedName, category),
      },
      enrichedAt: new Date().toISOString(),
    };
  }

  private resolveCategory(merchant: MerchantContext): SpendCategory {
    if (merchant.category) {
      return merchant.category;
    }

    if (merchant.mcc && CATEGORY_BY_MCC[merchant.mcc]) {
      return CATEGORY_BY_MCC[merchant.mcc]!;
    }

    return this.inferCategoryFromName(merchant.merchantName);
  }

  private scoreCard(
    card: CardContext,
    amount: number,
    category: SpendCategory,
    index: number,
  ): CardRouteRecommendation {
    const networkBonus = this.networkBonus(card.network, category);
    const issuerBonus = this.issuerBonus(card.issuer, category);
    const score = Number((networkBonus + issuerBonus - index * 0.01).toFixed(4));
    const effectiveRewardRate = Number((score * 100).toFixed(2));

    return {
      card,
      rank: 0,
      score,
      effectiveRewardRate,
      benefits: [
        {
          benefitId: `${card.network}-${category}-stub`,
          name: `${category} multiplier`,
          description: `Stub benefit for ${category} spend on ${card.productName}`,
          estimatedValue: Number((amount * score).toFixed(2)),
          confidence: 0.65,
          reason: `Heuristic match for ${category} at ${card.issuer}`,
        },
      ],
      rationale: `Selected based on ${category} spend heuristics for ${card.productName}`,
    };
  }

  private networkBonus(network: CardContext['network'], category: SpendCategory): number {
    const matrix: Record<CardContext['network'], Partial<Record<SpendCategory, number>>> = {
      visa: { dining: 0.03, travel: 0.025, groceries: 0.02 },
      mastercard: { dining: 0.028, travel: 0.03, gas: 0.025 },
      amex: { dining: 0.04, travel: 0.035, entertainment: 0.03 },
      discover: { gas: 0.05, groceries: 0.03, shopping: 0.025 },
    };

    return matrix[network][category] ?? 0.015;
  }

  private issuerBonus(issuer: string, category: SpendCategory): number {
    const normalized = issuer.toLowerCase();

    if (normalized.includes('chase') && category === 'travel') {
      return 0.01;
    }

    if (normalized.includes('amex') && category === 'dining') {
      return 0.012;
    }

    if (normalized.includes('citi') && category === 'groceries') {
      return 0.008;
    }

    return 0.004;
  }

  private normalizeMerchantName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s&'-]/g, '')
      .toLowerCase();
  }

  private inferCategoryFromName(name: string): SpendCategory {
    const normalized = name.toLowerCase();

    if (/cafe|coffee|restaurant|grill|kitchen|pizza|sushi|bar/.test(normalized)) {
      return 'dining';
    }

    if (/air|hotel|airline|marriott|hilton|uber|lyft/.test(normalized)) {
      return 'travel';
    }

    if (/market|grocery|whole foods|trader joe|costco|safeway/.test(normalized)) {
      return 'groceries';
    }

    if (/shell|chevron|exxon|bp|gas|fuel/.test(normalized)) {
      return 'gas';
    }

    if (/cinema|theatre|theater|amc|spotify|netflix/.test(normalized)) {
      return 'entertainment';
    }

    if (/amazon|target|walmart|store|shop/.test(normalized)) {
      return 'shopping';
    }

    return 'other';
  }

  private buildMerchantTags(name: string, category: SpendCategory): string[] {
    const tags = new Set<string>([category]);

    if (name.includes('airport')) {
      tags.add('travel-hub');
    }

    if (name.includes('express')) {
      tags.add('quick-service');
    }

    return [...tags];
  }
}

export const routingService: RoutingService = new DefaultRoutingService();
