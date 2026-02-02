import { describe, expect, it } from "vitest";
import {
  CardCatalogSchema,
  CardSchema,
  filterCardsByIds,
  findCardById,
  resolveBenefitRules,
} from "../card.js";
import { BenefitRuleSchema } from "../benefit.js";

const diningRule = BenefitRuleSchema.parse({
  id: "rule-dining",
  cardId: "chase-sapphire",
  name: "3x Dining",
  category: "dining",
  multiplier: 3,
});

const travelRule = BenefitRuleSchema.parse({
  id: "rule-travel",
  cardId: "chase-sapphire",
  name: "2x Travel",
  category: "travel",
  multiplier: 2,
});

const sapphire = CardSchema.parse({
  id: "chase-sapphire",
  issuer: "Chase",
  productName: "Sapphire Preferred",
  network: "visa",
  benefitRuleIds: ["rule-dining", "rule-travel"],
  benefitRules: [diningRule, travelRule],
});

const freedom = CardSchema.parse({
  id: "chase-freedom",
  issuer: "Chase",
  productName: "Freedom Flex",
  network: "visa",
  benefitRuleIds: [],
});

const catalog = CardCatalogSchema.parse({
  version: "2026.06",
  generatedAt: "2026-06-18T00:00:00.000Z",
  cards: [sapphire, freedom],
});

describe("CardSchema", () => {
  it("parses card with defaults", () => {
    expect(sapphire.isActive).toBe(true);
    expect(sapphire.benefitRuleIds).toHaveLength(2);
  });
});

describe("CardCatalogSchema", () => {
  it("requires at least one card", () => {
    expect(() =>
      CardCatalogSchema.parse({
        version: "1",
        generatedAt: "2026-06-18T00:00:00.000Z",
        cards: [],
      }),
    ).toThrow();
  });
});

describe("findCardById", () => {
  it("finds existing card", () => {
    const card = findCardById(catalog, "chase-sapphire");
    expect(card?.productName).toBe("Sapphire Preferred");
  });

  it("returns undefined for missing card", () => {
    expect(findCardById(catalog, "missing")).toBeUndefined();
  });
});

describe("resolveBenefitRules", () => {
  it("returns embedded rules when present", () => {
    const rules = resolveBenefitRules(sapphire);
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.id)).toContain("rule-dining");
  });
});

describe("filterCardsByIds", () => {
  it("filters catalog to requested IDs", () => {
    const filtered = filterCardsByIds(catalog, ["chase-freedom"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("chase-freedom");
  });
});
