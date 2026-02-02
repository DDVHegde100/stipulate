import {
  BenefitCapSchema,
  BenefitPeriodSchema,
  type BenefitCap,
  type BenefitPeriod,
} from "@stipulate/schema";
import type { CapNormalizationContext, RawParsedBenefit } from "../types.js";

const PERIOD_ALIASES: Record<string, BenefitPeriod> = {
  annual: "annual",
  yearly: "annual",
  year: "annual",
  calendar_year: "annual",
  quarterly: "quarterly",
  quarter: "quarterly",
  monthly: "monthly",
  month: "monthly",
  per_transaction: "per_transaction",
  transaction: "per_transaction",
  per_txn: "per_transaction",
  lifetime: "lifetime",
};

/** Normalize a raw period string to a BenefitPeriod enum value. */
export function normalizeCapPeriod(raw: string): BenefitPeriod {
  const key = raw.toLowerCase().replace(/[^a-z_]/g, "_").replace(/_+/g, "_");
  return PERIOD_ALIASES[key] ?? "annual";
}

/** Parse dollar amounts from benefit guide text (e.g. "$150 annual", "$5/month"). */
export function parseCapFromText(text: string, defaultCurrency = "USD"): BenefitCap | null {
  const capPattern =
    /\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+)?(month|monthly|quarter|quarterly|year|annual|yearly|transaction)?/i;
  const match = text.match(capPattern);

  if (!match) return null;

  const amountStr = match[1].replace(/,/g, "");
  const amount = parseFloat(amountStr);
  if (Number.isNaN(amount)) return null;

  const periodRaw = match[2] ?? "annual";
  const period = normalizeCapPeriod(periodRaw);

  return BenefitCapSchema.parse({
    id: `cap-${period}-${amount}`,
    period,
    limit: {
      amountMinor: Math.round(amount * 100),
      currency: defaultCurrency,
    },
    description: text.trim(),
  });
}

/** Normalize caps on raw parsed benefits into schema-valid BenefitCap objects. */
export function normalizeBenefitCaps(
  benefits: RawParsedBenefit[],
  context: CapNormalizationContext,
): { benefits: RawParsedBenefit[]; caps: BenefitCap[]; notes: string[] } {
  const notes: string[] = [];
  const allCaps: BenefitCap[] = [];

  const normalizedBenefits = benefits.map((benefit, index) => {
    if (!benefit.caps || benefit.caps.length === 0) {
      return benefit;
    }

    const normalizedCaps = benefit.caps.map((rawCap, capIndex) => {
      const period = normalizeCapPeriod(rawCap.period);
      const currency = rawCap.currency ?? context.defaultCurrency;

      const cap = BenefitCapSchema.parse({
        id: `cap-${index}-${capIndex}`,
        period,
        limit: {
          amountMinor: rawCap.amountMinor,
          currency,
        },
        description: rawCap.description,
        resetPolicy: period === "monthly" ? "statement_cycle" : "calendar_year",
      });

      allCaps.push(cap);
      notes.push(
        `Normalized cap for "${benefit.name}": ${period} limit ${rawCap.amountMinor} ${currency}`,
      );

      return {
        period,
        amountMinor: cap.limit.amountMinor,
        currency: cap.limit.currency,
        description: cap.description,
      };
    });

    return { ...benefit, caps: normalizedCaps };
  });

  return { benefits: normalizedBenefits, caps: allCaps, notes };
}

/** Extract cap mentions from unstructured text blocks. */
export function extractCapsFromText(
  blocks: string[],
  context: CapNormalizationContext,
): BenefitCap[] {
  const caps: BenefitCap[] = [];
  const capKeywords = /cap|limit|maximum|up to|capped at/i;

  for (const block of blocks) {
    if (!capKeywords.test(block)) continue;

    const parsed = parseCapFromText(block, context.defaultCurrency);
    if (parsed) {
      caps.push(parsed);
    }
  }

  return caps;
}

/** Annualize a cap amount for comparison across periods. */
export function annualizeCapAmount(cap: BenefitCap): number {
  switch (cap.period) {
    case "monthly":
      return cap.limit.amountMinor * 12;
    case "quarterly":
      return cap.limit.amountMinor * 4;
    case "annual":
    case "lifetime":
      return cap.limit.amountMinor;
    case "per_transaction":
      return cap.limit.amountMinor;
    default:
      return cap.limit.amountMinor;
  }
}

/** Merge duplicate caps on the same benefit by taking the most restrictive limit. */
export function mergeDuplicateCaps(caps: BenefitCap[]): BenefitCap[] {
  const byPeriod = new Map<BenefitPeriod, BenefitCap>();

  for (const cap of caps) {
    const existing = byPeriod.get(cap.period);
    if (!existing || cap.limit.amountMinor < existing.limit.amountMinor) {
      byPeriod.set(cap.period, cap);
    }
  }

  return Array.from(byPeriod.values());
}

/** Validate cap periods against Zod schema. */
export function isValidBenefitPeriod(period: string): boolean {
  return BenefitPeriodSchema.safeParse(period).success;
}
