import { describe, expect, it } from "vitest";
import {
  applyIssuerOverride,
  findIssuerOverride,
  ISSUER_OVERRIDES,
} from "../overrides/issuer-overrides.js";

describe("ISSUER_OVERRIDES", () => {
  it("has overrides for major issuers", () => {
    expect(ISSUER_OVERRIDES.Chase).toBeDefined();
    expect(ISSUER_OVERRIDES.Amex).toBeDefined();
    expect(ISSUER_OVERRIDES["Capital One"]).toBeDefined();
    expect(ISSUER_OVERRIDES.Citi).toBeDefined();
  });
});

describe("findIssuerOverride", () => {
  it("finds Chase Lyft override", () => {
    const override = findIssuerOverride("Chase", "LYFT *RIDE");
    expect(override?.category).toBe("transit");
  });

  it("finds Amex Grubhub override", () => {
    const override = findIssuerOverride("Amex", "GRUBHUB*ORDER");
    expect(override?.category).toBe("dining");
  });

  it("returns undefined for unknown merchant", () => {
    expect(findIssuerOverride("Chase", "RANDOM STORE")).toBeUndefined();
  });
});

describe("applyIssuerOverride", () => {
  it("returns override fields", () => {
    const result = applyIssuerOverride("Chase", "DOORDASH");
    expect(result?.category).toBe("dining");
    expect(result?.overrideApplied).toContain("Chase");
  });
});
