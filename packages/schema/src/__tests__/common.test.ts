import { describe, expect, it } from "vitest";
import {
  moneyFromDecimal,
  moneyToDecimal,
  safeParse,
  SpendingCategorySchema,
} from "../common.js";

describe("moneyFromDecimal / moneyToDecimal", () => {
  it("rounds to minor units", () => {
    const money = moneyFromDecimal(19.99);
    expect(money.amountMinor).toBe(1999);
    expect(moneyToDecimal(money)).toBe(19.99);
  });
});

describe("safeParse", () => {
  it("returns success for valid input", () => {
    const result = safeParse(SpendingCategorySchema, "dining");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("dining");
    }
  });

  it("returns error for invalid input", () => {
    const result = safeParse(SpendingCategorySchema, "invalid");
    expect(result.success).toBe(false);
  });
});

describe("SpendingCategorySchema", () => {
  it("accepts all defined categories", () => {
    const categories = [
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
    ];

    for (const category of categories) {
      expect(SpendingCategorySchema.parse(category)).toBe(category);
    }
  });
});
