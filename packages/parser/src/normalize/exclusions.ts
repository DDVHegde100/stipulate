import {
  ExclusionSchema,
  type Exclusion,
  type ExclusionType,
} from '@stipulate/schema';
import type { ExclusionPattern, RawParsedBenefit } from '../types.js';

/** Known fast-food merchants that issuers often exclude from "dining" bonuses. */
export const FAST_FOOD_MERCHANTS = [
  'mcdonalds',
  "mcdonald's",
  'burger king',
  'wendys',
  "wendy's",
  'taco bell',
  'kfc',
  'subway',
  'chipotle',
  'panda express',
  'dominos',
  "domino's",
  'pizza hut',
  'dairy queen',
  'sonic drive-in',
  'jack in the box',
  'arbys',
  "arby's",
] as const;

/** Issuer-specific dining exclusion policies. */
export const DINING_EXCLUSION_POLICIES: Record<
  string,
  { excludesFastFood: boolean; excludedMerchants: string[]; notes: string }
> = {
  chase: {
    excludesFastFood: false,
    excludedMerchants: [],
    notes: 'Chase generally includes fast food in dining',
  },
  amex: {
    excludesFastFood: true,
    excludedMerchants: [...FAST_FOOD_MERCHANTS],
    notes: 'Amex often excludes fast food from restaurant category',
  },
  citi: {
    excludesFastFood: false,
    excludedMerchants: ['costco', 'sam\'s club', 'walmart'],
    notes: 'Citi excludes warehouse clubs from category bonuses',
  },
  'capital-one': {
    excludesFastFood: false,
    excludedMerchants: [],
    notes: 'Capital One dining includes most food establishments',
  },
};

export const EXCLUSION_PATTERNS: ExclusionPattern[] = [
  {
    type: 'merchant',
    patterns: [
      /(?:purchases at|excluding|excludes?)\s+([A-Za-z0-9\s'&/]+?)(?:\.|,|do not|are not|$)/i,
      /(costco|sam's club|walmart|target|amazon)/i,
    ],
    matcherTemplate: (match) => match[1]?.trim().toLowerCase() ?? match[0].trim().toLowerCase(),
    reason: 'Merchant explicitly excluded in benefit guide',
  },
  {
    type: 'merchant',
    patterns: [/fast food(?: establishments?| restaurants?)?(?: are| is)? excluded/i],
    matcherTemplate: () => 'fast food',
    reason: 'Fast food excluded from dining category',
  },
  {
    type: 'mcc',
    patterns: [/mcc\s*[#:]?\s*(\d{4})/i, /merchant category code\s*(\d{4})/i],
    matcherTemplate: (match) => match[1]!,
    reason: 'MCC excluded from bonus category',
  },
  {
    type: 'category',
    patterns: [
      /cash equivalent/i,
      /gift cards?/i,
      /money orders?/i,
      /balance transfers?/i,
      /wire transfers?/i,
    ],
    matcherTemplate: () => 'cash_equivalent',
    reason: 'Cash equivalent purchases excluded',
  },
  {
    type: 'channel',
    patterns: [/third[- ]party payment/i, /payment processors?/i, /venmo|paypal|square cash/i],
    matcherTemplate: (match) => match[0].trim().toLowerCase(),
    reason: 'Third-party payment channel excluded',
  },
  {
    type: 'geography',
    patterns: [
      /outside (?:the )?u\.?s\.?/i,
      /international purchases?(?: do not)?/i,
      /foreign (?:currency )?transactions?/i,
    ],
    matcherTemplate: () => 'international',
    reason: 'Geographic restriction on bonus eligibility',
  },
];

/** Parse comma-separated merchant exclusion lists from fine print. */
export function parseMerchantListExclusions(text: string): Exclusion[] {
  const exclusions: Exclusion[] = [];
  let id = 0;

  const listPatterns = [
    /excludes?\s+(?:purchases at\s+)?([^.]+(?:,\s*[^.]+)*)/i,
    /does not include\s+([^.]+)/i,
    /not eligible[:\s]+([^.]+)/i,
  ];

  for (const pattern of listPatterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;

    const merchants = match[1]
      .split(/,|\band\b/)
      .map((m) => m.trim().toLowerCase())
      .filter((m) => m.length > 1 && m.length < 60);

    for (const merchant of merchants) {
      exclusions.push(
        ExclusionSchema.parse({
          id: `merchant-list-${id++}`,
          type: 'merchant',
          matcher: merchant,
          reason: 'Parsed from merchant exclusion list',
          sourceNote: text.slice(0, 120),
        }),
      );
    }
  }

  return dedupeExclusions(exclusions);
}

/** Apply issuer dining policy — auto-add fast food exclusions where applicable. */
export function applyIssuerDiningExclusions(issuer: string, category: string): Exclusion[] {
  if (category !== 'dining') return [];

  const issuerKey = issuer.toLowerCase().replace(/\s+/g, '-').replace('american-express', 'amex');
  const policy =
    DINING_EXCLUSION_POLICIES[issuerKey] ??
    DINING_EXCLUSION_POLICIES[issuer.split(' ')[0]?.toLowerCase() ?? ''];

  if (!policy) return [];

  const exclusions: Exclusion[] = [];

  if (policy.excludesFastFood) {
    exclusions.push(
      ExclusionSchema.parse({
        id: `dining-fast-food-${issuerKey}`,
        type: 'merchant',
        matcher: 'fast food',
        reason: policy.notes,
        isRegex: false,
      }),
    );
  }

  for (const merchant of policy.excludedMerchants) {
    exclusions.push(
      ExclusionSchema.parse({
        id: `dining-excl-${issuerKey}-${merchant.replace(/\s+/g, '-')}`,
        type: 'merchant',
        matcher: merchant,
        reason: policy.notes,
      }),
    );
  }

  return exclusions;
}

/** Disambiguate fast food vs full-service dining for a merchant name. */
export function disambiguateDiningMerchant(
  merchantName: string,
): 'fast_food' | 'full_service' | 'unknown' {
  const lower = merchantName.toLowerCase();
  if (FAST_FOOD_MERCHANTS.some((ff) => lower.includes(ff))) return 'fast_food';
  if (/steakhouse|bistro|grill|kitchen|cafe|restaurant|sushi|ramen/i.test(lower)) {
    return 'full_service';
  }
  return 'unknown';
}

export function normalizeExclusionType(raw: string): ExclusionType {
  const key = raw.toLowerCase().trim();
  const valid: ExclusionType[] = ['merchant', 'mcc', 'category', 'channel', 'geography'];
  return valid.includes(key as ExclusionType) ? (key as ExclusionType) : 'merchant';
}

export function extractExclusionsFromText(textBlocks: string[]): Exclusion[] {
  const exclusions: Exclusion[] = [];
  let idCounter = 0;

  for (const text of textBlocks) {
    exclusions.push(...parseMerchantListExclusions(text));

    for (const pattern of EXCLUSION_PATTERNS) {
      for (const regex of pattern.patterns) {
        const match = text.match(regex);
        if (!match) continue;

        const matcher = pattern.matcherTemplate(match);
        if (!matcher) continue;

        exclusions.push(
          ExclusionSchema.parse({
            id: `exclusion-${idCounter++}`,
            type: pattern.type,
            matcher,
            reason: pattern.reason,
            sourceNote: text.slice(0, 120),
          }),
        );
      }
    }
  }

  return dedupeExclusions(exclusions);
}

export function normalizeBenefitExclusions(
  benefits: RawParsedBenefit[],
  options: { issuer?: string } = {},
): { benefits: RawParsedBenefit[]; exclusions: Exclusion[]; notes: string[] } {
  const notes: string[] = [];
  const allExclusions: Exclusion[] = [];

  const normalizedBenefits = benefits.map((benefit, benefitIndex) => {
    const issuerExclusions = options.issuer
      ? applyIssuerDiningExclusions(options.issuer, benefit.category)
      : [];

    if (issuerExclusions.length > 0) {
      notes.push(`Applied ${issuerExclusions.length} issuer dining exclusions for "${benefit.name}"`);
      allExclusions.push(...issuerExclusions);
    }

    if (!benefit.exclusions || benefit.exclusions.length === 0) {
      return benefit;
    }

    const normalized = benefit.exclusions.map((raw, exclusionIndex) => {
      const type = normalizeExclusionType(raw.type);
      const exclusion = ExclusionSchema.parse({
        id: `ex-${benefitIndex}-${exclusionIndex}`,
        type,
        matcher: raw.matcher.trim(),
        reason: raw.reason,
      });

      allExclusions.push(exclusion);
      notes.push(`Normalized exclusion for "${benefit.name}": ${type} → ${raw.matcher}`);

      return { type, matcher: exclusion.matcher, reason: exclusion.reason };
    });

    return { ...benefit, exclusions: normalized };
  });

  return {
    benefits: normalizedBenefits,
    exclusions: dedupeExclusions(allExclusions),
    notes,
  };
}

export function dedupeExclusions(exclusions: Exclusion[]): Exclusion[] {
  const seen = new Set<string>();
  const result: Exclusion[] = [];

  for (const exclusion of exclusions) {
    const key = `${exclusion.type}:${exclusion.matcher.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(exclusion);
  }

  return result;
}

export function isTransactionExcluded(
  exclusions: Exclusion[],
  merchantName: string,
  mcc?: string,
  category?: string,
): Exclusion | undefined {
  const normalizedMerchant = merchantName.toLowerCase();

  for (const exclusion of exclusions) {
    switch (exclusion.type) {
      case 'merchant':
        if (exclusion.matcher === 'fast food' && disambiguateDiningMerchant(merchantName) === 'fast_food') {
          return exclusion;
        }
        if (normalizedMerchant.includes(exclusion.matcher.toLowerCase())) return exclusion;
        break;
      case 'mcc':
        if (mcc === exclusion.matcher) return exclusion;
        break;
      case 'category':
        if (category === exclusion.matcher) return exclusion;
        break;
      default:
        break;
    }
  }

  return undefined;
}

export function parseExclusionFootnotes(footnotes: string[]): Exclusion[] {
  const exclusionBlocks = footnotes.filter((note) =>
    /exclud|do not qualify|not eligible|does not earn/i.test(note),
  );
  return extractExclusionsFromText(exclusionBlocks);
}
