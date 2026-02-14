import { describe, it, expect } from 'vitest';
import { runRoutingBenchmark } from '../benchmark/harness.js';

describe('routing hot path benchmark', () => {
  it('meets p99 latency guardrail under 20ms', () => {
    const result = runRoutingBenchmark({ iterations: 300, p99LimitMs: 20 });
    expect(result.passed).toBe(true);
    expect(result.p99Ms).toBeLessThanOrEqual(20);
  });
});
