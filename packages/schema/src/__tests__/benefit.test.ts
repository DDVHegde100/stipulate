import { describe, expect, it } from "vitest";
import {
  BenefitCapSchema,
  BenefitRuleSchema,
  computeCappedReward,
  ExclusionSchema,
  matchesExclusion,
} from "../benefit.js";
import { MoneySchema, moneyFromDecimal } from "../common.js";

describe("BenefitCapSchema", () => {
  it("parses a valid cap", () => {
    const cap = BenefitCapSchema.parse({
      id: "cap-1",
      period: "annual",
      limit: { amountMinor: 15000, currency: "USD" },
    });

    expect(cap.period).toBe("annual");
    expect(cap.resetPolicy).toBe("calendar_year");
    expect(cap.carryForward).toBe(false);
  });
});

describe("ExclusionSchema", () => {
  it("parses merchant exclusion", () => {
    const exclusion = ExclusionSchema.parse({
      id: "ex-1",
      type: "merchant",
      matcher: "walmart",
    });

    expect(exclusion.isRegex).toBe(false);
  });
});

describe("matchesExclusion", () => {
  const merchantExclusion = ExclusionSchema.parse({
    id: "ex-merchant",
    type: "merchant",
    matcher: "amazon",
  });

  it("matches substring merchant names", () => {
    expect(matchesExclusion(merchantExclusion, "AMAZON.COM")).toBe(true);
    expect(matchesExclusion(merchantExclusion, "Whole Foods")).toBe(false);
  });

  it("matches MCC exclusions", () => {
    const mccExclusion = ExclusionSchema.parse({
      id: "ex-mcc",
      type: "mcc",
      matcher: "6011",
    });

    expect(matchesExclusion(mccExclusion, "ATM", "6011")).toBe(true);
    expect(matchesExclusion(mccExclusion, "ATM", "5411")).toBe(false);
  });
});

describe("BenefitRuleSchema", () => {
  it("parses a dining rule with defaults", () => {
    const rule = BenefitRuleSchema.parse({
      id: "rule-dining",
      cardId: "card-1",
      name: "3x Dining",
      category: "dining",
      multiplier: 3,
    });

    expect(rule.rewardType).toBe("points");
    expect(rule.caps).toEqual([]);
    expect(rule.requiresActivation).toBe(false);
  });
});

describe("computeCappedReward", () => {
  const cappedRule = BenefitRuleSchema.parse({
    id: "rule-capped",
    cardId: "card-1",
    name: "5x Streaming",
    category: "streaming",
    multiplier: 5,
    caps: [
      {
        id: "cap-monthly",
        period: "monthly",
        limit: { amountMinor: 500, currency: "USD" },
      },
    ],
  });

  it("caps reward when exceeding period limit", () => {
    const spend = moneyFromDecimal(200);
    const reward = computeCappedReward(cappedRule, spend, 400);
    expect(reward).toBe(100);
  });

  it("returns full reward when under cap", () => {
    const spend = moneyFromDecimal(50);
    const reward = computeCappedReward(cappedRule, spend, 0);
    expect(reward).toBe(250);
  });
});

describe("MoneySchema", () => {
  it("defaults currency to USD", () => {
    const money = MoneySchema.parse({ amountMinor: 100 });
    expect(money.currency).toBe("USD");
  });
});
