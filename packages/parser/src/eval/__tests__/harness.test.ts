import { describe, it, expect } from 'vitest';
import {
  GOLDEN_FIXTURES,
  evaluateFixture,
  runEvalSuite,
  assertEvalGate,
} from '../harness.js';

describe('parser eval harness', () => {
  it('has golden fixtures for major issuers', () => {
    expect(GOLDEN_FIXTURES.length).toBeGreaterThanOrEqual(5);
    expect(GOLDEN_FIXTURES.some((f) => f.issuer === 'Chase')).toBe(true);
    expect(GOLDEN_FIXTURES.some((f) => f.issuer === 'American Express')).toBe(true);
  });

  it('evaluates a single fixture', async () => {
    const fixture = GOLDEN_FIXTURES[0]!;
    const result = await evaluateFixture(fixture);
    expect(result.fixtureId).toBe(fixture.id);
    expect(result.rulesExtracted).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
  });

  it('runs full eval suite', async () => {
    const report = await runEvalSuite(GOLDEN_FIXTURES.slice(0, 2));
    expect(report.total).toBe(2);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.results).toHaveLength(2);
  });

  it('passes eval gate at default threshold', async () => {
    const report = await runEvalSuite(GOLDEN_FIXTURES.slice(0, 2));
    expect(() => assertEvalGate(report, 0.5)).not.toThrow();
  });
});
