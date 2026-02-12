import { normalizeMerchantName } from '@stipulate/schema';
import { parseStatementDescriptor } from '../descriptor/parser.js';
import { resolveMerchant } from '../resolver.js';

export interface ReceiptLineItem {
  description: string;
  amountMinor?: number;
}

export interface ParsedReceipt {
  rawText: string;
  merchantName?: string;
  merchantHint?: string;
  totalMinor?: number;
  date?: string;
  lineItems: ReceiptLineItem[];
  confidence: number;
  parseNotes: string[];
}

/** Common receipt header patterns for merchant extraction. */
const MERCHANT_HEADER_PATTERNS = [
  /^([A-Z0-9\s&'.-]{3,60})$/m,
  /(?:merchant|store|vendor)[:\s]+(.+)/i,
  /(?:thank you for visiting)\s+(.+)/i,
];

const TOTAL_PATTERNS = [
  /(?:total|amount due|balance due)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /(?:total)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
];

const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  /(\d{4}-\d{2}-\d{2})/,
];

/**
 * Parse OCR text output from a receipt image into structured merchant data.
 * Feature-flagged pipeline — expects pre-OCR'd text, not raw image bytes.
 */
export function parseReceiptOcrText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const parseNotes: string[] = [];
  let merchantName: string | undefined;
  let totalMinor: number | undefined;
  let date: string | undefined;

  for (const line of lines.slice(0, 8)) {
    if (!merchantName && line.length >= 3 && line.length <= 60 && !/^\d/.test(line)) {
      if (!/(total|subtotal|tax|receipt|date|time|qty|item)/i.test(line)) {
        merchantName = line;
        parseNotes.push(`Merchant header: ${line}`);
        break;
      }
    }
  }

  for (const pattern of MERCHANT_HEADER_PATTERNS) {
    const match = rawText.match(pattern);
    if (match?.[1] && !merchantName) {
      merchantName = match[1].trim();
      parseNotes.push('Extracted merchant from header pattern');
    }
  }

  for (const pattern of TOTAL_PATTERNS) {
    const match = rawText.match(pattern);
    if (match?.[1]) {
      totalMinor = Math.round(parseFloat(match[1].replace(/,/g, '')) * 100);
      parseNotes.push(`Total: $${match[1]}`);
      break;
    }
  }

  for (const pattern of DATE_PATTERNS) {
    const match = rawText.match(pattern);
    if (match?.[1]) {
      date = match[1];
      break;
    }
  }

  const lineItems: ReceiptLineItem[] = lines
    .filter((line) => /\$\s*[\d,]+\.\d{2}/.test(line) && !/total|tax|subtotal/i.test(line))
    .slice(0, 20)
    .map((line) => {
      const amountMatch = line.match(/\$\s*([\d,]+\.\d{2})/);
      const amountMinor = amountMatch
        ? Math.round(parseFloat(amountMatch[1]!.replace(/,/g, '')) * 100)
        : undefined;
      const description = line.replace(/\$\s*[\d,]+\.\d{2}/, '').trim();
      return { description, amountMinor };
    });

  const confidence = merchantName ? 0.78 : 0.45;

  return {
    rawText,
    merchantName,
    merchantHint: merchantName ? normalizeMerchantName(merchantName) : undefined,
    totalMinor,
    date,
    lineItems,
    confidence,
    parseNotes,
  };
}

/** Full receipt OCR → merchant enrichment pipeline. */
export function enrichFromReceiptOcr(
  rawText: string,
  options: { issuer?: string } = {},
) {
  const receipt = parseReceiptOcrText(rawText);

  if (!receipt.merchantName) {
    return {
      receipt,
      enrichment: null,
    };
  }

  const descriptor = parseStatementDescriptor(receipt.merchantName);
  const enrichment = resolveMerchant(descriptor.merchantName, {
    issuer: options.issuer,
    rawDescriptor: receipt.merchantName,
  });

  return { receipt, enrichment };
}
