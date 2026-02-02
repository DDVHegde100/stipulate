import type { SpendingCategory } from "@stipulate/schema";
import type { CategoryMapping, RawParsedBenefit } from "../types.js";

/** Canonical mappings from issuer verbiage to Stipulate spending categories. */
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    raw: "dining",
    normalized: "dining",
    aliases: [
      "restaurants",
      "restaurant",
      "dining purchases",
      "food and drink",
      "bars",
      "cafes",
      "fast food",
      "eat",
    ],
  },
  {
    raw: "groceries",
    normalized: "groceries",
    aliases: [
      "grocery",
      "supermarket",
      "grocery stores",
      "food stores",
      "warehouse grocery",
    ],
  },
  {
    raw: "travel",
    normalized: "travel",
    aliases: [
      "travel purchases",
      "general travel",
      "travel and transit",
      "vacation",
    ],
  },
  {
    raw: "airfare",
    normalized: "airfare",
    aliases: [
      "airlines",
      "airline",
      "air travel",
      "air carriers",
      "flights",
      "airfare",
    ],
  },
  {
    raw: "hotels",
    normalized: "hotels",
    aliases: [
      "hotel",
      "lodging",
      "motels",
      "resorts",
      "airbnb",
      "short-term rental",
    ],
  },
  {
    raw: "transit",
    normalized: "transit",
    aliases: [
      "transit",
      "public transportation",
      "rideshare",
      "uber",
      "lyft",
      "taxi",
      "parking",
      "tolls",
      "commuter",
    ],
  },
  {
    raw: "gas",
    normalized: "gas",
    aliases: [
      "gas",
      "fuel",
      "gas stations",
      "service stations",
      "ev charging",
      "petroleum",
    ],
  },
  {
    raw: "streaming",
    normalized: "streaming",
    aliases: [
      "streaming",
      "streaming services",
      "digital entertainment",
      "netflix",
      "spotify",
      "subscriptions",
    ],
  },
  {
    raw: "entertainment",
    normalized: "entertainment",
    aliases: [
      "entertainment",
      "movies",
      "theatre",
      "amusement",
      "recreation",
      "sports events",
    ],
  },
  {
    raw: "retail",
    normalized: "retail",
    aliases: [
      "retail",
      "department stores",
      "online retail",
      "merchandise",
      "shopping",
    ],
  },
  {
    raw: "healthcare",
    normalized: "healthcare",
    aliases: [
      "healthcare",
      "medical",
      "pharmacy",
      "drug stores",
      "hospital",
      "dental",
    ],
  },
  {
    raw: "utilities",
    normalized: "utilities",
    aliases: [
      "utilities",
      "electric",
      "water",
      "internet",
      "cable",
      "phone",
      "telecom",
    ],
  },
  {
    raw: "cash_equivalent",
    normalized: "cash_equivalent",
    aliases: [
      "cash equivalent",
      "gift cards",
      "money orders",
      "wire transfers",
      "balance transfers",
      "cash advance",
    ],
  },
  {
    raw: "other",
    normalized: "other",
    aliases: [
      "all other",
      "everything else",
      "other purchases",
      "base earn",
      "1x",
      "default",
    ],
  },
];

const aliasIndex = buildAliasIndex(CATEGORY_MAPPINGS);

function buildAliasIndex(mappings: CategoryMapping[]): Map<string, SpendingCategory> {
  const index = new Map<string, SpendingCategory>();

  for (const mapping of mappings) {
    index.set(normalizeCategoryKey(mapping.raw), mapping.normalized);
    for (const alias of mapping.aliases) {
      index.set(normalizeCategoryKey(alias), mapping.normalized);
    }
  }

  return index;
}

function normalizeCategoryKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Resolve a raw category string to a canonical SpendingCategory. */
export function normalizeCategory(raw: string): SpendingCategory {
  const key = normalizeCategoryKey(raw);
  const direct = aliasIndex.get(key);
  if (direct) return direct;

  for (const [alias, category] of aliasIndex.entries()) {
    if (key.includes(alias) || alias.includes(key)) {
      return category;
    }
  }

  return "other";
}

/** Normalize categories on all raw parsed benefits. */
export function normalizeBenefitCategories(
  benefits: RawParsedBenefit[],
): { benefits: RawParsedBenefit[]; notes: string[] } {
  const notes: string[] = [];

  const normalized = benefits.map((benefit) => {
    const canonical = normalizeCategory(benefit.category);
    if (canonical !== benefit.category) {
      notes.push(
        `Mapped category "${benefit.category}" → "${canonical}" for benefit "${benefit.name}"`,
      );
    }
    return { ...benefit, category: canonical };
  });

  return { benefits: normalized, notes };
}

/** Infer category from free-text benefit description using keyword heuristics. */
export function inferCategoryFromDescription(description: string): SpendingCategory {
  const lower = description.toLowerCase();

  for (const mapping of CATEGORY_MAPPINGS) {
    for (const alias of mapping.aliases) {
      if (lower.includes(alias)) {
        return mapping.normalized;
      }
    }
  }

  return "other";
}

/** Validate that all benefits have resolvable categories. */
export function validateBenefitCategories(benefits: RawParsedBenefit[]): string[] {
  const warnings: string[] = [];

  for (const benefit of benefits) {
    const normalized = normalizeCategory(benefit.category);
    if (normalized === "other" && benefit.category !== "other") {
      warnings.push(
        `Unmapped category "${benefit.category}" for "${benefit.name}" defaulted to other`,
      );
    }
  }

  return warnings;
}
