import {
  BenefitCapSchema,
  BenefitPeriodSchema,
  type BenefitCap,
  type BenefitPeriod,
} from '@stipulate/schema';
import type { CapNormalizationContext, RawParsedBenefit } from '../types.js';

const PERIOD_ALIASES: Record<string, BenefitPeriod> = {
  annual: 'annual',
  yearly: 'annual',
  year: 'annual',
  calendar_year: 'annual',
  'calendar year': 'annual',
  quarterly: 'quarterly',
  quarter: 'quarterly',
  monthly: 'monthly',
  month: 'monthly',
  per_transaction: 'per_transaction',
  transaction: 'per_transaction',
  per_txn: 'per_transaction',
  lifetime: 'lifetime',
  statement: 'monthly',
  'statement cycle': 'monthly',
};

/** Tracks spend against a cap over time for routing. */
export interface CapTrackerState {
  capId: string;
  period: BenefitPeriod;
  limitMinor: number;
  spentMinor: number;
  periodStart: string;
  periodEnd: string;
  exhausted: boolean;
}

/** Parsed cap with optional threshold trigger ("after $6,000/year"). */
export interface ParsedCapRule {
  cap: BenefitCap;
  thresholdMinor?: number;
  appliesAfterThreshold: boolean;
  rotatingCategory?: string;
  notes: string[];
}

/** Normalize a raw period string to a BenefitPeriod enum value. */
export function normalizeCapPeriod(raw: string): BenefitPeriod {
  const key = raw.toLowerCase().replace(/[^a-z_\s]/g, ' ').trim().replace(/\s+/g, '_');
  return PERIOD_ALIASES[key] ?? PERIOD_ALIASES[raw.toLowerCase()] ?? 'annual';
}

/** Parse complex cap phrases from issuer fine print. */
export function parseCapPeriodFromText(text: string): ParsedCapRule | null {
  const notes: string[] = [];
  const lower = text.toLowerCase();

  // "$1,500 per quarter" / "$1,500/quarter"
  const quarterMatch = text.match(
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+|\/)?\s*quarter/i,
  );
  if (quarterMatch) {
    const amountMinor = dollarsToMinor(quarterMatch[1]!);
    return {
      cap: buildCap('quarterly', amountMinor, text),
      appliesAfterThreshold: false,
      notes: ['Parsed quarterly cap'],
    };
  }

  // "after $6,000/year" threshold before bonus applies
  const thresholdMatch = text.match(
    /after\s+\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+)?(?:calendar\s+)?year/i,
  );
  if (thresholdMatch) {
    const thresholdMinor = dollarsToMinor(thresholdMatch[1]!);
    notes.push(`Spend threshold before bonus: $${thresholdMatch[1]}`);
    return {
      cap: buildCap('annual', thresholdMinor, text, 'Spend threshold — bonus applies after this amount'),
      thresholdMinor,
      appliesAfterThreshold: true,
      notes,
    };
  }

  // "$6,000 per calendar year" / "annual cap of $6,000"
  const annualMatch =
    text.match(/\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+)?(?:calendar\s+)?year/i) ??
    text.match(/annual\s+cap\s+of\s+\$\s*([\d,]+(?:\.\d{2})?)/i);
  if (annualMatch) {
    const amountMinor = dollarsToMinor(annualMatch[1]!);
    return {
      cap: buildCap('annual', amountMinor, text),
      appliesAfterThreshold: false,
      notes: ['Parsed annual cap'],
    };
  }

  // "$5 per month ($60 annual)"
  const monthlyWithAnnual = text.match(
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+|\/)?\s*month\s*\(\s*\$\s*([\d,]+(?:\.\d{2})?)\s*annual\s*\)/i,
  );
  if (monthlyWithAnnual) {
    const monthlyMinor = dollarsToMinor(monthlyWithAnnual[1]!);
    const annualMinor = dollarsToMinor(monthlyWithAnnual[2]!);
    notes.push('Dual monthly/annual cap notation detected');
    return {
      cap: buildCap('monthly', monthlyMinor, text, `Monthly cap; $${monthlyWithAnnual[2]} annual equivalent`),
      thresholdMinor: annualMinor,
      appliesAfterThreshold: false,
      notes,
    };
  }

  // Rotating category cap: "up to $1,500 in combined purchases each quarter"
  if (/combined purchases|rotating/i.test(lower)) {
    const rotatingMatch = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    if (rotatingMatch) {
      return {
        cap: buildCap('quarterly', dollarsToMinor(rotatingMatch[1]!), text),
        rotatingCategory: 'rotating',
        appliesAfterThreshold: false,
        notes: ['Rotating category combined cap'],
      };
    }
  }

  return parseCapFromText(text) ? { cap: parseCapFromText(text)!, appliesAfterThreshold: false, notes: [] } : null;
}

/** Parse dollar amounts from benefit guide text (e.g. "$150 annual", "$5/month"). */
export function parseCapFromText(text: string, defaultCurrency = 'USD'): BenefitCap | null {
  const capPattern =
    /\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:per\s+)?(month|monthly|quarter|quarterly|year|annual|yearly|transaction)?/i;
  const match = text.match(capPattern);

  if (!match) return null;

  const amount = parseFloat(match[1]!.replace(/,/g, ''));
  if (Number.isNaN(amount)) return null;

  const period = normalizeCapPeriod(match[2] ?? 'annual');

  return BenefitCapSchema.parse({
    id: `cap-${period}-${amount}`,
    period,
    limit: { amountMinor: Math.round(amount * 100), currency: defaultCurrency },
    description: text.trim(),
  });
}

/** Compute cap tracker state given YTD spend. */
export function computeCapTrackerState(
  cap: BenefitCap,
  spentMinor: number,
  asOf: Date = new Date(),
): CapTrackerState {
  const { periodStart, periodEnd } = capPeriodBounds(cap.period, asOf);
  const remaining = cap.limit.amountMinor - spentMinor;

  return {
    capId: cap.id,
    period: cap.period,
    limitMinor: cap.limit.amountMinor,
    spentMinor,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    exhausted: remaining <= 0,
  };
}

/** Return calendar bounds for a benefit cap period. */
export function capPeriodBounds(
  period: BenefitPeriod,
  asOf: Date = new Date(),
): { periodStart: Date; periodEnd: Date } {
  const year = asOf.getUTCFullYear();
  const month = asOf.getUTCMonth();

  switch (period) {
    case 'quarterly': {
      const qStart = Math.floor(month / 3) * 3;
      return {
        periodStart: new Date(Date.UTC(year, qStart, 1)),
        periodEnd: new Date(Date.UTC(year, qStart + 3, 0, 23, 59, 59)),
      };
    }
    case 'monthly':
      return {
        periodStart: new Date(Date.UTC(year, month, 1)),
        periodEnd: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)),
      };
    case 'lifetime':
      return {
        periodStart: new Date(Date.UTC(2000, 0, 1)),
        periodEnd: new Date(Date.UTC(2099, 11, 31, 23, 59, 59)),
      };
    case 'per_transaction':
      return { periodStart: asOf, periodEnd: asOf };
    case 'annual':
    default:
      return {
        periodStart: new Date(Date.UTC(year, 0, 1)),
        periodEnd: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      };
  }
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
      if (benefit.description) {
        const parsed = parseCapPeriodFromText(benefit.description);
        if (parsed) {
          allCaps.push(parsed.cap);
          notes.push(...parsed.notes);
          return {
            ...benefit,
            caps: [
              {
                period: parsed.cap.period,
                amountMinor: parsed.cap.limit.amountMinor,
                currency: parsed.cap.limit.currency,
                description: parsed.cap.description,
              },
            ],
          };
        }
      }
      return benefit;
    }

    const normalizedCaps = benefit.caps.map((rawCap, capIndex) => {
      const period = normalizeCapPeriod(rawCap.period);
      const currency = rawCap.currency ?? context.defaultCurrency;

      const cap = BenefitCapSchema.parse({
        id: `cap-${index}-${capIndex}`,
        period,
        limit: { amountMinor: rawCap.amountMinor, currency },
        description: rawCap.description,
        resetPolicy: period === 'monthly' ? 'statement_cycle' : 'calendar_year',
      });

      allCaps.push(cap);
      notes.push(`Normalized cap for "${benefit.name}": ${period} limit ${rawCap.amountMinor} ${currency}`);

      return {
        period,
        amountMinor: cap.limit.amountMinor,
        currency: cap.limit.currency,
        description: cap.description,
      };
    });

    return { ...benefit, caps: normalizedCaps };
  });

  return { benefits: normalizedBenefits, caps: mergeDuplicateCaps(allCaps), notes };
}

/** Extract cap mentions from unstructured text blocks. */
export function extractCapsFromText(
  blocks: string[],
  context: CapNormalizationContext,
): BenefitCap[] {
  const caps: BenefitCap[] = [];
  const capKeywords = /cap|limit|maximum|up to|capped at|after \$/i;

  for (const block of blocks) {
    if (!capKeywords.test(block)) continue;

    const parsed = parseCapPeriodFromText(block) ?? (parseCapFromText(block, context.defaultCurrency) ? { cap: parseCapFromText(block, context.defaultCurrency)!, appliesAfterThreshold: false, notes: [] } : null);
    if (parsed) caps.push(parsed.cap);
  }

  return mergeDuplicateCaps(caps);
}

/** Annualize a cap amount for comparison across periods. */
export function annualizeCapAmount(cap: BenefitCap): number {
  switch (cap.period) {
    case 'monthly':
      return cap.limit.amountMinor * 12;
    case 'quarterly':
      return cap.limit.amountMinor * 4;
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

export function isValidBenefitPeriod(period: string): boolean {
  return BenefitPeriodSchema.safeParse(period).success;
}

function dollarsToMinor(dollarStr: string): number {
  return Math.round(parseFloat(dollarStr.replace(/,/g, '')) * 100);
}

function buildCap(
  period: BenefitPeriod,
  amountMinor: number,
  sourceText: string,
  description?: string,
): BenefitCap {
  return BenefitCapSchema.parse({
    id: `cap-${period}-${amountMinor}`,
    period,
    limit: { amountMinor, currency: 'USD' },
    description: description ?? sourceText.trim().slice(0, 200),
    resetPolicy: period === 'monthly' ? 'statement_cycle' : 'calendar_year',
  });
}
