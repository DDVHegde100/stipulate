import type { SpendingCategory } from "@stipulate/schema";

/** Issuer-specific merchant category overrides. */
export interface IssuerOverride {
  issuer: string;
  merchantPattern: string | RegExp;
  mcc?: string;
  category?: SpendingCategory;
  reason: string;
}

/** Chase codes certain merchants differently for Sapphire travel bonus. */
export const CHASE_OVERRIDES: IssuerOverride[] = [
  {
    issuer: "Chase",
    merchantPattern: /delta air/i,
    mcc: "3000",
    category: "travel",
    reason: "Chase codes Delta as travel, not airfare MCC 4511",
  },
  {
    issuer: "Chase",
    merchantPattern: /lyft/i,
    category: "transit",
    reason: "Chase Lyft benefit codes as transit",
  },
  {
    issuer: "Chase",
    merchantPattern: /doordash/i,
    category: "dining",
    reason: "Chase DoorDash DashPass codes as dining",
  },
  {
    issuer: "Chase",
    merchantPattern: /instacart/i,
    category: "groceries",
    reason: "Chase Instacart benefit codes as groceries",
  },
];

/** Amex Gold dining and grocery overrides. */
export const AMEX_OVERRIDES: IssuerOverride[] = [
  {
    issuer: "Amex",
    merchantPattern: /grubhub/i,
    category: "dining",
    reason: "Amex codes Grubhub as dining for Gold 4x",
  },
  {
    issuer: "Amex",
    merchantPattern: /cheesecake factory/i,
    category: "dining",
    reason: "Amex restaurant network partner",
  },
  {
    issuer: "Amex",
    merchantPattern: /whole foods/i,
    category: "groceries",
    reason: "Amex codes Whole Foods as groceries (not Amazon retail)",
  },
];

/** Capital One Venture travel coding overrides. */
export const CAPITAL_ONE_OVERRIDES: IssuerOverride[] = [
  {
    issuer: "Capital One",
    merchantPattern: /booking\.com/i,
    category: "travel",
    reason: "Capital One codes Booking.com as travel",
  },
  {
    issuer: "Capital One",
    merchantPattern: /vrbo/i,
    category: "hotels",
    reason: "Capital One codes Vrbo as lodging",
  },
];

/** Citi Strata Premier category overrides. */
export const CITI_OVERRIDES: IssuerOverride[] = [
  {
    issuer: "Citi",
    merchantPattern: /costco/i,
    mcc: "5300",
    category: "retail",
    reason: "Costco codes as warehouse club, not groceries for most issuers",
  },
  {
    issuer: "Citi",
    merchantPattern: /shell/i,
    category: "gas",
    reason: "Citi gas station bonus category",
  },
];

/** All issuer overrides indexed by issuer name. */
export const ISSUER_OVERRIDES: Record<string, IssuerOverride[]> = {
  Chase: CHASE_OVERRIDES,
  Amex: AMEX_OVERRIDES,
  "American Express": AMEX_OVERRIDES,
  "Capital One": CAPITAL_ONE_OVERRIDES,
  Citi: CITI_OVERRIDES,
};

/** Find matching issuer override for a merchant name. */
export function findIssuerOverride(
  issuer: string,
  merchantName: string,
): IssuerOverride | undefined {
  const overrides = ISSUER_OVERRIDES[issuer] ?? [];

  for (const override of overrides) {
    if (typeof override.merchantPattern === "string") {
      if (merchantName.toLowerCase().includes(override.merchantPattern.toLowerCase())) {
        return override;
      }
    } else if (override.merchantPattern.test(merchantName)) {
      return override;
    }
  }

  return undefined;
}

/** Apply issuer override to enrichment fields. */
export function applyIssuerOverride(
  issuer: string,
  merchantName: string,
): { mcc?: string; category?: SpendingCategory; overrideApplied?: string } | undefined {
  const override = findIssuerOverride(issuer, merchantName);
  if (!override) return undefined;

  return {
    mcc: override.mcc,
    category: override.category,
    overrideApplied: `${override.issuer}:${override.reason}`,
  };
}
