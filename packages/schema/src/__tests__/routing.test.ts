import { describe, expect, it } from "vitest";
import { moneyFromDecimal } from "../common.js";
import {
  getBestCard,
  RankedCardSchema,
  RouteRequestSchema,
  RouteResponseSchema,
  sortRankedCards,
  validateRouteResponseConsistency,
} from "../routing.js";

describe("RouteRequestSchema", () => {
  it("parses a valid routing request", () => {
    const request = RouteRequestSchema.parse({
      merchantName: "Chipotle",
      amount: { amountMinor: 1500, currency: "USD" },
      userCardIds: ["card-1", "card-2"],
    });

    expect(request.channel).toBe("unknown");
    expect(request.isInternational).toBe(false);
    expect(request.preferences?.optimizeFor).toBe("max_reward");
  });

  it("requires at least one user card", () => {
    expect(() =>
      RouteRequestSchema.parse({
        amount: moneyFromDecimal(10),
        userCardIds: [],
      }),
    ).toThrow();
  });
});

describe("RouteResponseSchema", () => {
  const rankedCards = [
    RankedCardSchema.parse({
      cardId: "card-best",
      rank: 1,
      score: 95,
      effectiveMultiplier: 3,
      estimatedReward: moneyFromDecimal(4.5),
      applicableRuleIds: ["rule-1"],
    }),
    RankedCardSchema.parse({
      cardId: "card-second",
      rank: 2,
      score: 70,
      effectiveMultiplier: 2,
      estimatedReward: moneyFromDecimal(3),
      applicableRuleIds: ["rule-2"],
    }),
  ];

  const response = RouteResponseSchema.parse({
    requestId: "req-1",
    rankedCards,
    bestCardId: "card-best",
    computedAt: "2026-06-18T12:00:00.000Z",
  });

  it("parses response with warnings default", () => {
    expect(response.warnings).toEqual([]);
  });

  it("sorts ranked cards by rank", () => {
    const shuffled = sortRankedCards([
      rankedCards[1],
      rankedCards[0],
    ]);
    expect(shuffled[0].cardId).toBe("card-best");
  });

  it("returns best card", () => {
    const best = getBestCard(response);
    expect(best?.cardId).toBe("card-best");
  });

  it("validates consistency", () => {
    expect(validateRouteResponseConsistency(response)).toBe(true);
  });
});
