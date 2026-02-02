import { z } from "zod";
import {
  PurchaseChannelSchema,
  SpendingCategorySchema,
} from "./common.js";

export const MerchantEnrichmentSourceSchema = z.enum([
  "user",
  "mcc_db",
  "llm",
  "override",
  "issuer",
  "plaid",
  "unknown",
]);

/** Enriched merchant identity used for routing and benefit matching. */
export const MerchantEnrichmentSchema = z.object({
  merchantName: z.string().min(1),
  normalizedName: z.string().min(1),
  mcc: z
    .string()
    .regex(/^\d{4}$/, "MCC must be a 4-digit code")
    .optional(),
  mccDescription: z.string().optional(),
  category: SpendingCategorySchema.optional(),
  /** Confidence score from 0 (unknown) to 1 (certain). */
  confidence: z.number().min(0).max(1),
  source: MerchantEnrichmentSourceSchema,
  /** Alternative MCC candidates when confidence is low. */
  mccCandidates: z
    .array(
      z.object({
        mcc: z.string().regex(/^\d{4}$/),
        description: z.string().optional(),
        score: z.number().min(0).max(1),
      }),
    )
    .optional(),
  /** Issuer override applied (e.g. Chase codes Delta as travel). */
  overrideApplied: z.string().optional(),
});

export type MerchantEnrichment = z.infer<typeof MerchantEnrichmentSchema>;
export type MerchantEnrichmentSource = z.infer<typeof MerchantEnrichmentSourceSchema>;

/** Normalize a raw merchant descriptor for fuzzy matching. */
export function normalizeMerchantName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Merge two enrichments, preferring higher confidence fields. */
export function mergeEnrichments(
  primary: MerchantEnrichment,
  secondary: MerchantEnrichment,
): MerchantEnrichment {
  const usePrimary = primary.confidence >= secondary.confidence;

  return {
    merchantName: primary.merchantName,
    normalizedName: primary.normalizedName,
    mcc: usePrimary ? primary.mcc ?? secondary.mcc : secondary.mcc ?? primary.mcc,
    mccDescription:
      usePrimary
        ? primary.mccDescription ?? secondary.mccDescription
        : secondary.mccDescription ?? primary.mccDescription,
    category:
      usePrimary
        ? primary.category ?? secondary.category
        : secondary.category ?? primary.category,
    confidence: Math.max(primary.confidence, secondary.confidence),
    source: usePrimary ? primary.source : secondary.source,
    mccCandidates: primary.mccCandidates ?? secondary.mccCandidates,
    overrideApplied: primary.overrideApplied ?? secondary.overrideApplied,
  };
}

/** Map a spending category from MCC description heuristics. */
export function categoryFromMccDescription(description: string): z.infer<typeof SpendingCategorySchema> | undefined {
  const lower = description.toLowerCase();

  if (/restaurant|dining|food service|bar|café|cafe/.test(lower)) {
    return "dining";
  }
  if (/grocery|supermarket|market/.test(lower)) {
    return "groceries";
  }
  if (/airline|air transport/.test(lower)) {
    return "airfare";
  }
  if (/hotel|lodging|motel/.test(lower)) {
    return "hotels";
  }
  if (/gas|fuel|petroleum|service station/.test(lower)) {
    return "gas";
  }
  if (/transit|taxi|rideshare|parking/.test(lower)) {
    return "transit";
  }
  if (/streaming|subscription|digital goods/.test(lower)) {
    return "streaming";
  }
  if (/entertainment|theatre|cinema|amusement/.test(lower)) {
    return "entertainment";
  }
  if (/drug store|pharmacy|medical|health/.test(lower)) {
    return "healthcare";
  }
  if (/utility|electric|water|telecom/.test(lower)) {
    return "utilities";
  }
  if (/insurance/.test(lower)) {
    return "insurance";
  }
  if (/school|college|university|education/.test(lower)) {
    return "education";
  }
  if (/charity|non-profit|donation/.test(lower)) {
    return "charity";
  }
  if (/government|tax|fee/.test(lower)) {
    return "government";
  }
  if (/money order|wire transfer|financial|cash advance/.test(lower)) {
    return "cash_equivalent";
  }

  return "other";
}

export const MerchantContextSchema = z.object({
  enrichment: MerchantEnrichmentSchema,
  channel: PurchaseChannelSchema.default("unknown"),
  isInternational: z.boolean().default(false),
});

export type MerchantContext = z.infer<typeof MerchantContextSchema>;
