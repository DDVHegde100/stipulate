import { describe, expect, it } from "vitest";
import { heuristicParse, rawBenefitsToRules } from "../parse/llm-parser.js";
import { normalizeCategory } from "../normalize/categories.js";
import { parseCapFromText } from "../normalize/caps.js";
import { extractExclusionsFromText } from "../normalize/exclusions.js";

describe("heuristicParse", () => {
  it("extracts dining and travel rules from text", () => {
    const text = [
      "Earn 3x points on dining at restaurants including cafes and bars.",
      "Earn 2x points on travel including airlines and hotels.",
      "Earn 1x point on all other purchases.",
    ].join("\n");

    const benefits = heuristicParse(text);
    expect(benefits.length).toBeGreaterThanOrEqual(2);
    expect(benefits.some((b) => b.category === "dining")).toBe(true);
    expect(benefits.some((b) => b.category === "travel")).toBe(true);
  });
});

describe("normalizeCategory", () => {
  it("maps aliases to canonical categories", () => {
    expect(normalizeCategory("restaurants")).toBe("dining");
    expect(normalizeCategory("gas stations")).toBe("gas");
    expect(normalizeCategory("unknown category xyz")).toBe("other");
  });
});

describe("parseCapFromText", () => {
  it("parses monthly cap amounts", () => {
    const cap = parseCapFromText("Streaming bonus capped at $5 per month");
    expect(cap).not.toBeNull();
    expect(cap?.limit.amountMinor).toBe(500);
    expect(cap?.period).toBe("monthly");
  });
});

describe("extractExclusionsFromText", () => {
  it("finds merchant exclusions", () => {
    const exclusions = extractExclusionsFromText([
      "Purchases at Costco do not qualify for bonus categories.",
      "Cash equivalents including gift cards are excluded.",
    ]);

    expect(exclusions.some((e) => e.matcher.includes("costco"))).toBe(true);
    expect(exclusions.some((e) => e.type === "category")).toBe(true);
  });
});

describe("rawBenefitsToRules", () => {
  it("produces valid benefit rules", () => {
    const raw = heuristicParse("Earn 3x points on dining at restaurants.");
    const rules = rawBenefitsToRules(raw, "test-card");
    expect(rules[0].cardId).toBe("test-card");
    expect(rules[0].multiplier).toBe(3);
  });
});
