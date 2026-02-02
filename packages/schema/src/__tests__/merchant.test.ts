import { describe, expect, it } from "vitest";
import {
  categoryFromMccDescription,
  mergeEnrichments,
  MerchantEnrichmentSchema,
  normalizeMerchantName,
} from "../merchant.js";

describe("normalizeMerchantName", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeMerchantName("STARBUCKS #1234")).toBe("starbucks 1234");
    expect(normalizeMerchantName("  Whole   Foods  ")).toBe("whole foods");
  });
});

describe("MerchantEnrichmentSchema", () => {
  it("parses enrichment with MCC", () => {
    const enrichment = MerchantEnrichmentSchema.parse({
      merchantName: "Starbucks",
      normalizedName: "starbucks",
      mcc: "5814",
      mccDescription: "Fast Food Restaurants",
      category: "dining",
      confidence: 0.95,
      source: "mcc_db",
    });

    expect(enrichment.mcc).toBe("5814");
    expect(enrichment.confidence).toBe(0.95);
  });

  it("rejects invalid MCC format", () => {
    expect(() =>
      MerchantEnrichmentSchema.parse({
        merchantName: "Test",
        normalizedName: "test",
        mcc: "58",
        confidence: 0.5,
        source: "unknown",
      }),
    ).toThrow();
  });
});

describe("mergeEnrichments", () => {
  const lowConfidence = MerchantEnrichmentSchema.parse({
    merchantName: "Delta",
    normalizedName: "delta",
    mcc: "4511",
    category: "airfare",
    confidence: 0.6,
    source: "mcc_db",
  });

  const highConfidence = MerchantEnrichmentSchema.parse({
    merchantName: "Delta Air Lines",
    normalizedName: "delta air lines",
    mcc: "3000",
    category: "travel",
    confidence: 0.9,
    source: "override",
    overrideApplied: "chase-travel",
  });

  it("prefers higher confidence fields", () => {
    const merged = mergeEnrichments(lowConfidence, highConfidence);
    expect(merged.mcc).toBe("3000");
    expect(merged.category).toBe("travel");
    expect(merged.confidence).toBe(0.9);
  });
});

describe("categoryFromMccDescription", () => {
  it("maps common MCC descriptions", () => {
    expect(categoryFromMccDescription("Restaurants")).toBe("dining");
    expect(categoryFromMccDescription("Grocery Stores, Supermarkets")).toBe("groceries");
    expect(categoryFromMccDescription("Airlines, Air Carriers")).toBe("airfare");
    expect(categoryFromMccDescription("Automated Fuel Dispensers")).toBe("gas");
  });
});
