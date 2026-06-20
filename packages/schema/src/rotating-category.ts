import { z } from 'zod';
import { SpendingCategorySchema } from './common.js';

export const RotatingCategoryStateTypeSchema = z.enum([
  'custom_cash_top',
  'discover_quarter',
  'chase_quarter',
  'manual',
]);

export const RotatingCategoryStateSchema = z.object({
  cardId: z.string().min(1),
  stateType: RotatingCategoryStateTypeSchema,
  activeCategory: SpendingCategorySchema.optional(),
  quarterKey: z.string().optional(),
  activated: z.boolean().default(false),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().nullable().optional(),
});

export const UpsertRotatingCategoryStateSchema = RotatingCategoryStateSchema.omit({
  effectiveFrom: true,
  effectiveTo: true,
});

export type RotatingCategoryStateType = z.infer<typeof RotatingCategoryStateTypeSchema>;
export type RotatingCategoryState = z.infer<typeof RotatingCategoryStateSchema>;
export type UpsertRotatingCategoryState = z.infer<typeof UpsertRotatingCategoryStateSchema>;
