import { describe, expect, it } from "vitest";
import {
  findMccMatches,
  jaccardSimilarity,
  loadMccDatabase,
  resolveMerchant,
  resolveMccCode,
} from "../resolver.js";

describe("loadMccDatabase", () => {
  it("loads at least 50 MCC entries", () => {
    const entries = loadMccDatabase();
    expect(entries.length).toBeGreaterThanOrEqual(50);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical token sets", () => {
    expect(jaccardSimilarity(["starbucks", "coffee"], ["starbucks", "coffee"])).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccardSimilarity(["apple"], ["orange"])).toBe(0);
  });
});

describe("findMccMatches", () => {
  it("matches Starbucks to fast food MCC", () => {
    const matches = findMccMatches("STARBUCKS #1234");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].mcc).toBe("5814");
    expect(matches[0].category).toBe("dining");
  });

  it("matches Delta to airline MCC", () => {
    const matches = findMccMatches("DELTA AIR LINES");
    expect(matches.some((m) => m.mcc === "4511")).toBe(true);
  });

  it("matches Shell to gas station MCC", () => {
    const matches = findMccMatches("SHELL OIL");
    expect(matches.some((m) => m.mcc === "5541")).toBe(true);
  });
});

describe("resolveMerchant", () => {
  it("returns enrichment with MCC and category", () => {
    const enrichment = resolveMerchant("CHIPOTLE MEX GR");
    expect(enrichment.mcc).toBe("5814");
    expect(enrichment.category).toBe("dining");
    expect(enrichment.confidence).toBeGreaterThan(0.5);
    expect(enrichment.source).toBe("mcc_db");
  });

  it("applies Chase issuer override for Delta", () => {
    const enrichment = resolveMerchant("DELTA AIR LINES", { issuer: "Chase" });
    expect(enrichment.category).toBe("travel");
    expect(enrichment.source).toBe("override");
    expect(enrichment.overrideApplied).toContain("Chase");
  });

  it("normalizes merchant name", () => {
    const enrichment = resolveMerchant("  WHOLE FOODS MARKET  ");
    expect(enrichment.normalizedName).toBe("whole foods market");
  });
});

describe("resolveMccCode", () => {
  it("finds entry by MCC code", () => {
    const entry = resolveMccCode("5411");
    expect(entry?.description).toContain("Grocery");
    expect(entry?.category).toBe("groceries");
  });
});
