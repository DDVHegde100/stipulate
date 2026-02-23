import { z } from 'zod';

export const WalletCardSchema = z.object({
  cardId: z.string().min(1),
  label: z.string().min(1),
  addedAt: z.string().datetime({ offset: true }),
});

export const RouteRecommendationSchema = z.object({
  merchant: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  recommendedCard: z.string().nullable(),
  recommendedCardLabel: z.string().optional(),
  estimatedRewardMinor: z.number().int().nonnegative().optional(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  factors: z.array(z.object({
    label: z.string(),
    value: z.union([z.string(), z.number()]),
  })).default([]),
});

export type WalletCard = z.infer<typeof WalletCardSchema>;
export type RouteRecommendation = z.infer<typeof RouteRecommendationSchema>;
