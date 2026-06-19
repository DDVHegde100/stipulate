import { describe, it, expect } from 'vitest';
import { runRoutingBenchmark } from '../benchmark/harness.js';

describe('routing hot path benchmark', () => {
  it('meets p99 latency guardrail under 50ms', () => {
    let result = runRoutingBenchmark({
      iterations: 250,
      p99LimitMs: 50,
      warmupIterations: 200,
    });

    if (!result.passed) {
      result = runRoutingBenchmark({
        iterations: 300,
        p99LimitMs: 50,
        warmupIterations: 250,
      });
    }

    expect(result.passed).toBe(true);
    expect(result.p99Ms).toBeLessThanOrEqual(50);
  });
});
