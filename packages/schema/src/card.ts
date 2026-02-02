import { z } from "zod";
import {
  CardNetworkSchema,
  MetadataSchema,
  MoneySchema,
} from "./common.js";
import { BenefitRuleSchema } from "./benefit.js";

/** Credit card product with linked benefit rules. */
export const CardSchema = z.object({
  id: z.string().min(1),
  issuer: z.string().min(1),
  productName: z.string().min(1),
  network: CardNetworkSchema,
  annualFee: MoneySchema.optional(),
  /** Foreign transaction fee as a decimal (e.g. 0.03 = 3%). */
  foreignTransactionFeeRate: z.number().min(0).max(1).optional(),
  benefitRuleIds: z.array(z.string()).default([]),
  /** Embedded rules when catalog ships inline (optional denormalization). */
  benefitRules: z.array(BenefitRuleSchema).optional(),
  /** URL to issuer benefit guide or terms. */
  benefitGuideUrl: z.string().url().optional(),
  /** Whether the card is currently offered to new applicants. */
  isActive: z.boolean().default(true),
  metadata: MetadataSchema.optional(),
});

/** Versioned collection of card products for routing and enrichment. */
export const CardCatalogSchema = z.object({
  version: z.string().min(1),
  generatedAt: z.string().datetime({ offset: true }),
  issuer: z.string().optional(),
  cards: z.array(CardSchema).min(1),
  metadata: MetadataSchema.optional(),
});

export type Card = z.infer<typeof CardSchema>;
export type CardCatalog = z.infer<typeof CardCatalogSchema>;

/** Look up a card by ID within a catalog. */
export function findCardById(catalog: CardCatalog, cardId: string): Card | undefined {
  return catalog.cards.find((card) => card.id === cardId);
}

/** Resolve benefit rules for a card, preferring embedded rules over ID references. */
export function resolveBenefitRules(
  card: Card,
  catalog?: CardCatalog,
): z.infer<typeof BenefitRuleSchema>[] {
  if (card.benefitRules && card.benefitRules.length > 0) {
    return card.benefitRules;
  }

  if (!catalog) {
    return [];
  }

  const allRules: z.infer<typeof BenefitRuleSchema>[] = [];
  for (const otherCard of catalog.cards) {
    if (otherCard.benefitRules) {
      allRules.push(...otherCard.benefitRules);
    }
  }

  return allRules.filter((rule) => card.benefitRuleIds.includes(rule.id));
}

/** Filter catalog to cards the user holds. */
export function filterCardsByIds(catalog: CardCatalog, cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return catalog.cards.filter((card) => idSet.has(card.id));
}
