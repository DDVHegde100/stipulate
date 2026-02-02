import {
  ExclusionSchema,
  type Exclusion,
  type ExclusionType,
} from "@stipulate/schema";
import type { ExclusionPattern, RawParsedBenefit } from "../types.js";

/** Regex patterns for common exclusion language in benefit guides. */
export const EXCLUSION_PATTERNS: ExclusionPattern[] = [
  {
    type: "merchant",
    patterns: [
      /(?:purchases at|excluding|excludes?)\s+([A-Za-z0-9\s'&]+?)(?:\.|,|do not|are not|$)/i,
      /(costco|sam's club|walmart|target|amazon)/i,
    ],
    matcherTemplate: (match) => match[1]?.trim().toLowerCase() ?? match[0].trim().toLowerCase(),
    reason: "Merchant explicitly excluded in benefit guide",
  },
  {
    type: "mcc",
    patterns: [/mcc\s*[#:]?\s*(\d{4})/i, /merchant category code\s*(\d{4})/i],
    matcherTemplate: (match) => match[1],
    reason: "MCC excluded from bonus category",
  },
  {
    type: "category",
    patterns: [
      /cash equivalent/i,
      /gift cards?/i,
      /money orders?/i,
      /balance transfers?/i,
      /wire transfers?/i,
    ],
    matcherTemplate: () => "cash_equivalent",
    reason: "Cash equivalent purchases excluded",
  },
  {
    type: "channel",
    patterns: [
      /third[- ]party payment/i,
      /payment processors?/i,
      /venmo|paypal|square cash/i,
    ],
    matcherTemplate: (match) => match[0].trim().toLowerCase(),
    reason: "Third-party payment channel excluded",
  },
  {
    type: "geography",
    patterns: [
      /outside (?:the )?u\.?s\.?/i,
      /international purchases?(?: do not)?/i,
      /foreign (?:currency )?transactions?/i,
    ],
    matcherTemplate: () => "international",
    reason: "Geographic restriction on bonus eligibility",
  },
];

/** Normalize a raw exclusion type string. */
export function normalizeExclusionType(raw: string): ExclusionType {
  const key = raw.toLowerCase().trim();
  const valid: ExclusionType[] = ["merchant", "mcc", "category", "channel", "geography"];
  return valid.includes(key as ExclusionType) ? (key as ExclusionType) : "merchant";
}

/** Extract exclusions from unstructured text using pattern matching. */
export function extractExclusionsFromText(textBlocks: string[]): Exclusion[] {
  const exclusions: Exclusion[] = [];
  let idCounter = 0;

  for (const text of textBlocks) {
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

/** Normalize exclusions on raw parsed benefits. */
export function normalizeBenefitExclusions(
  benefits: RawParsedBenefit[],
): { benefits: RawParsedBenefit[]; exclusions: Exclusion[]; notes: string[] } {
  const notes: string[] = [];
  const allExclusions: Exclusion[] = [];

  const normalizedBenefits = benefits.map((benefit, benefitIndex) => {
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
      notes.push(
        `Normalized exclusion for "${benefit.name}": ${type} → ${raw.matcher}`,
      );

      return {
        type,
        matcher: exclusion.matcher,
        reason: exclusion.reason,
      };
    });

    return { ...benefit, exclusions: normalized };
  });

  return {
    benefits: normalizedBenefits,
    exclusions: dedupeExclusions(allExclusions),
    notes,
  };
}

/** Remove duplicate exclusions by type + matcher. */
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

/** Check if a transaction would be excluded by any rule. */
export function isTransactionExcluded(
  exclusions: Exclusion[],
  merchantName: string,
  mcc?: string,
  category?: string,
): Exclusion | undefined {
  const normalizedMerchant = merchantName.toLowerCase();

  for (const exclusion of exclusions) {
    switch (exclusion.type) {
      case "merchant":
        if (normalizedMerchant.includes(exclusion.matcher.toLowerCase())) {
          return exclusion;
        }
        break;
      case "mcc":
        if (mcc === exclusion.matcher) return exclusion;
        break;
      case "category":
        if (category === exclusion.matcher) return exclusion;
        break;
      default:
        break;
    }
  }

  return undefined;
}

/** Build exclusion list from benefit guide footnotes. */
export function parseExclusionFootnotes(footnotes: string[]): Exclusion[] {
  const exclusionBlocks = footnotes.filter((note) =>
    /exclud|do not qualify|not eligible|does not earn/i.test(note),
  );
  return extractExclusionsFromText(exclusionBlocks);
}
