import { describe, it, expect } from 'vitest';
import {
  normalizeCapPeriod,
  parseCapPeriodFromText,
  parseCapFromText,
  computeCapTrackerState,
  capPeriodBounds,
  annualizeCapAmount,
  mergeDuplicateCaps,
} from '../caps.js';

describe('cap period parser', () => {
  it('normalizes quarterly aliases', () => {
    expect(normalizeCapPeriod('quarter')).toBe('quarterly');
    expect(normalizeCapPeriod('Quarterly')).toBe('quarterly');
  });

  it('parses $1,500 per quarter from text', () => {
    const parsed = parseCapPeriodFromText('Earn 5% on up to $1,500 per quarter');
    expect(parsed).not.toBeNull();
    expect(parsed!.cap.period).toBe('quarterly');
    expect(parsed!.cap.limit.amountMinor).toBe(150_000);
  });

  it('parses annual cap with threshold trigger', () => {
    const parsed = parseCapPeriodFromText('5% after $6,000 per calendar year');
    expect(parsed).not.toBeNull();
    expect(parsed!.appliesAfterThreshold).toBe(true);
    expect(parsed!.thresholdMinor).toBe(600_000);
  });

  it('parses simple dollar cap from text', () => {
    const cap = parseCapFromText('$500 per billing cycle');
    expect(cap).not.toBeNull();
    expect(cap!.limit.amountMinor).toBe(50_000);
  });
});

describe('cap tracker state machine', () => {
  const cap = parseCapFromText('$1,500 per quarter')!;

  it('computes remaining spend before exhaustion', () => {
    const state = computeCapTrackerState(cap, 100_000, new Date('2026-02-15T12:00:00Z'));
    expect(state.exhausted).toBe(false);
    expect(state.spentMinor).toBe(100_000);
    expect(state.limitMinor).toBe(150_000);
  });

  it('marks cap exhausted when spend exceeds limit', () => {
    const state = computeCapTrackerState(cap, 200_000);
    expect(state.exhausted).toBe(true);
  });

  it('returns quarterly calendar bounds', () => {
    const { periodStart, periodEnd } = capPeriodBounds('quarterly', new Date('2026-05-15T00:00:00Z'));
    expect(periodStart.getUTCMonth()).toBe(3);
    expect(periodEnd.getUTCMonth()).toBe(5);
  });

  it('annualizes quarterly caps', () => {
    expect(annualizeCapAmount(cap)).toBe(600_000);
  });

  it('merges duplicate caps by period', () => {
    const merged = mergeDuplicateCaps([cap, cap]);
    expect(merged).toHaveLength(1);
  });
});
