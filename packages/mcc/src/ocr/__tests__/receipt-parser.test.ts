import { describe, it, expect } from 'vitest';
import { parseReceiptOcrText, enrichFromReceiptOcr } from '../receipt-parser.js';

describe('receipt OCR parser', () => {
  it('extracts merchant and total from OCR text', () => {
    const text = [
      'STARBUCKS COFFEE',
      '123 Main St',
      'Latte          $5.75',
      'Total          $5.75',
      '01/15/2026',
    ].join('\n');

    const receipt = parseReceiptOcrText(text);
    expect(receipt.merchantName).toBe('STARBUCKS COFFEE');
    expect(receipt.totalMinor).toBe(575);
    expect(receipt.lineItems.length).toBeGreaterThan(0);
  });

  it('enriches merchant from receipt OCR text', () => {
    const { enrichment } = enrichFromReceiptOcr(
      'WHOLE FOODS MARKET\nTotal $42.18',
    );
    expect(enrichment).not.toBeNull();
    expect(enrichment!.category).toBe('groceries');
  });
});
