import { describe, it, expect } from 'vitest';
import {
  PointsValuationTableSchema,
  getCentsPerPoint,
  pointsToCashMinor,
  inferProgramFromCardId,
  computeCashEquivalent,
} from '../valuation.js';

const sampleTable = PointsValuationTableSchema.parse({
  version: 'test',
  updatedAt: '2026-01-01T00:00:00.000Z',
  defaultCpp: 1.0,
  programs: [
    {
      id: 'chase_ur',
      name: 'Chase Ultimate Rewards',
      issuer: 'Chase',
      centsPerPoint: 1.5,
      floorCpp: 1.0,
      ceilingCpp: 2.0,
      transferPartners: ['hyatt'],
    },
    {
      id: 'amex_mr',
      name: 'Amex MR',
      issuer: 'Amex',
      centsPerPoint: 1.7,
      floorCpp: 1.0,
      ceilingCpp: 2.2,
      transferPartners: [],
    },
  ],
});

describe('PointsValuationTableSchema', () => {
  it('parses valuation table', () => {
    expect(sampleTable.programs).toHaveLength(2);
  });

  it('returns conservative CPP via floor', () => {
    expect(getCentsPerPoint(sampleTable, 'chase_ur', true)).toBe(1.0);
    expect(getCentsPerPoint(sampleTable, 'chase_ur', false)).toBe(2.0);
  });

  it('falls back to default for unknown program', () => {
    expect(getCentsPerPoint(sampleTable, 'unknown_program')).toBe(1.0);
  });
});

describe('pointsToCashMinor', () => {
  it('converts points to cents', () => {
    expect(pointsToCashMinor(1000, 1.5)).toBe(1500);
  });
});

describe('inferProgramFromCardId', () => {
  it('maps card prefixes to programs', () => {
    expect(inferProgramFromCardId('chase_sapphire_preferred')).toBe('chase_ur');
    expect(inferProgramFromCardId('amex_gold')).toBe('amex_mr');
  });
});

describe('computeCashEquivalent', () => {
  it('computes cash equivalent for routing', () => {
    const result = computeCashEquivalent(sampleTable, 'chase_sapphire_preferred', 300);
    expect(result.programId).toBe('chase_ur');
    expect(result.cashEquivalentMinor).toBe(300);
  });
});
