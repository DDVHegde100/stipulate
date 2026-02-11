import { describe, it, expect } from 'vitest';
import {
  parseStatementDescriptor,
  looksLikeStatementDescriptor,
} from '../parser.js';

describe('statement descriptor parser', () => {
  it('strips Square processor prefix', () => {
    const parsed = parseStatementDescriptor('SQ *BLUE BOTTLE COFFEE');
    expect(parsed.merchantName).toBe('BLUE BOTTLE COFFEE');
    expect(parsed.processor).toBe('square');
    expect(parsed.normalizedName).toContain('blue bottle');
  });

  it('strips Toast prefix', () => {
    const parsed = parseStatementDescriptor('TST* CHIPOTLE 1234');
    expect(parsed.processor).toBe('toast');
    expect(parsed.merchantName).toContain('CHIPOTLE');
  });

  it('strips store number suffix', () => {
    const parsed = parseStatementDescriptor('TRADER JOES #123');
    expect(parsed.storeNumber).toBe('123');
  });

  it('detects statement descriptor patterns', () => {
    expect(looksLikeStatementDescriptor('SQ *MERCHANT')).toBe(true);
    expect(looksLikeStatementDescriptor('Whole Foods Market')).toBe(false);
  });
});
