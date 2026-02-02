import { describe, expect, it } from "vitest";
import { runBenefitPipeline } from "../pipeline/runner.js";

describe("runBenefitPipeline", () => {
  it("runs full pipeline with synthetic fallback", async () => {
    const result = await runBenefitPipeline({
      issuer: "Chase",
      cardId: "chase-sapphire",
      productName: "Sapphire Preferred",
      llmModel: "stub",
      skipExtraction: false,
    });

    expect(result.success).toBe(true);
    expect(result.normalizedRules.length).toBeGreaterThan(0);
    expect(result.catalog?.cards[0].id).toBe("chase-sapphire");
    expect(result.stages.map((s) => s.stage)).toContain("assemble");
  });

  it("supports dry run without parsing", async () => {
    const result = await runBenefitPipeline({
      issuer: "Amex",
      cardId: "amex-gold",
      productName: "Gold Card",
      llmModel: "stub",
      dryRun: true,
    });

    expect(result.parse).toBeUndefined();
    expect(result.stages.some((s) => s.stage === "parse")).toBe(true);
  });
});
