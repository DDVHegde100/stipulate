import { z } from "zod";

/** ISO 4217 currency code. */
export const CurrencyCodeSchema = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter uppercase ISO 4217 code");

/** Monetary amount in minor units (cents) to avoid floating-point drift. */
export const MoneySchema = z.object({
  amountMinor: z.number().int(),
  currency: CurrencyCodeSchema.default("USD"),
});

/** Spending category taxonomy used across routing and benefit rules. */
export const SpendingCategorySchema = z.enum([
  "dining",
  "groceries",
  "travel",
  "airfare",
  "hotels",
  "transit",
  "gas",
  "streaming",
  "entertainment",
  "retail",
  "healthcare",
  "utilities",
  "insurance",
  "education",
  "charity",
  "government",
  "cash_equivalent",
  "other",
]);

export const CardNetworkSchema = z.enum([
  "visa",
  "mastercard",
  "amex",
  "discover",
]);

export const BenefitPeriodSchema = z.enum([
  "annual",
  "quarterly",
  "monthly",
  "per_transaction",
  "lifetime",
]);

export const ExclusionTypeSchema = z.enum([
  "merchant",
  "mcc",
  "category",
  "channel",
  "geography",
]);

export const PurchaseChannelSchema = z.enum([
  "in_store",
  "online",
  "mobile_wallet",
  "contactless",
  "mail_order",
  "unknown",
]);

export const DateRangeSchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }).optional(),
});

export const MetadataSchema = z.record(z.string(), z.unknown());

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;
export type Money = z.infer<typeof MoneySchema>;
export type SpendingCategory = z.infer<typeof SpendingCategorySchema>;
export type CardNetwork = z.infer<typeof CardNetworkSchema>;
export type BenefitPeriod = z.infer<typeof BenefitPeriodSchema>;
export type ExclusionType = z.infer<typeof ExclusionTypeSchema>;
export type PurchaseChannel = z.infer<typeof PurchaseChannelSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;

/** Convert a decimal dollar amount to minor units (cents). */
export function moneyFromDecimal(
  amount: number,
  currency: CurrencyCode = "USD",
): Money {
  return {
    amountMinor: Math.round(amount * 100),
    currency,
  };
}

/** Convert minor units back to a decimal amount. */
export function moneyToDecimal(money: Money): number {
  return money.amountMinor / 100;
}

/** Safely parse unknown input through a Zod schema, returning a Result-like object. */
export function safeParse<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
