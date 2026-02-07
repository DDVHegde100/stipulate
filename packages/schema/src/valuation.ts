import { z } from 'zod';

/** Loyalty program slug (e.g. chase_ur, amex_mr). */
export const PointsProgramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  issuer: z.string().min(1),
  /** Cents per point — baseline redemption value. */
  centsPerPoint: z.number().positive(),
  /** Floor CPP for conservative routing estimates. */
  floorCpp: z.number().positive().optional(),
  /** Ceiling CPP for optimistic routing estimates. */
  ceilingCpp: z.number().positive().optional(),
  /** Transfer partners available from this program. */
  transferPartners: z.array(z.string()).default([]),
  /** Whether points pool across cards in the same program. */
  poolsAcrossCards: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PointsValuationTableSchema = z.object({
  version: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  /** Default CPP when program-specific value unavailable. */
  defaultCpp: z.number().positive().default(1.0),
  programs: z.array(PointsProgramSchema).min(1),
});

/** Per-integrator override for CPP assumptions. */
export const ValuationOverrideSchema = z.object({
  orgId: z.string().uuid(),
  programId: z.string().min(1),
  centsPerPoint: z.number().positive(),
  effectiveFrom: z.string().datetime({ offset: true }),
  effectiveTo: z.string().datetime({ offset: true }).optional(),
});

export type PointsProgram = z.infer<typeof PointsProgramSchema>;
export type PointsValuationTable = z.infer<typeof PointsValuationTableSchema>;
export type ValuationOverride = z.infer<typeof ValuationOverrideSchema>;

/** Look up CPP for a program, falling back to default. */
export function getCentsPerPoint(
  table: PointsValuationTable,
  programId: string,
  conservative = true,
): number {
  const program = table.programs.find((p) => p.id === programId);
  if (!program) return table.defaultCpp;
  if (conservative && program.floorCpp !== undefined) return program.floorCpp;
  if (!conservative && program.ceilingCpp !== undefined) return program.ceilingCpp;
  return program.centsPerPoint;
}

/** Convert points earned to cash equivalent in minor units (cents). */
export function pointsToCashMinor(
  points: number,
  cpp: number,
): number {
  return Math.round(points * cpp);
}

/** Map card_id prefix to points program for routing. */
export function inferProgramFromCardId(cardId: string): string | undefined {
  if (cardId.startsWith('chase_')) return 'chase_ur';
  if (cardId.startsWith('amex_')) return 'amex_mr';
  if (cardId.startsWith('citi_')) return 'citi_thankyou';
  if (cardId.startsWith('capital_one_')) return 'capital_one_miles';
  if (cardId.startsWith('discover_')) return 'discover_cashback';
  if (cardId.startsWith('bofa_')) return 'bofa_points';
  if (cardId.startsWith('wells_fargo_')) return 'wells_go_far';
  if (cardId.startsWith('us_bank_')) return 'us_bank_altitude';
  return undefined;
}

/** Compute cash equivalent for a ranked routing result. */
export function computeCashEquivalent(
  table: PointsValuationTable,
  cardId: string,
  pointsEarned: number,
  conservative = true,
): { cashEquivalentMinor: number; cpp: number; programId: string | undefined } {
  const programId = inferProgramFromCardId(cardId);
  const cpp = programId ? getCentsPerPoint(table, programId, conservative) : table.defaultCpp;
  return {
    cashEquivalentMinor: pointsToCashMinor(pointsEarned, cpp),
    cpp,
    programId,
  };
}
