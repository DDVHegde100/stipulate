import { describe, expect, it } from 'vitest';
import { getSloSnapshot, recordRouteLatency, resetSloTracker } from '../slo-tracker.js';

describe('slo-tracker', () => {
  it('tracks route latency percentiles', () => {
    resetSloTracker();
    recordRouteLatency(5);
    recordRouteLatency(10);
    recordRouteLatency(15);
    const snap = getSloSnapshot();
    expect(snap.routeSampleCount).toBe(3);
    expect(snap.routeP50Ms).toBeGreaterThan(0);
  });
});
