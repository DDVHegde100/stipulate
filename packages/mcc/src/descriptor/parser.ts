import { normalizeMerchantName } from '@stipulate/schema';

/** Parsed components from a raw card statement descriptor. */
export interface ParsedDescriptor {
  raw: string;
  cleaned: string;
  normalizedName: string;
  merchantName: string;
  processor?: string;
  locationHint?: string;
  storeNumber?: string;
  confidence: number;
  parseNotes: string[];
}

/** Known payment processor prefixes stripped from descriptors. */
const PROCESSOR_PREFIXES: Array<{ pattern: RegExp; processor: string }> = [
  { pattern: /^SQ\s*\*\s*/i, processor: 'square' },
  { pattern: /^TST\s*\*\s*/i, processor: 'toast' },
  { pattern: /^SP\s*\*\s*/i, processor: 'stripe' },
  { pattern: /^PAYPAL\s*\*\s*/i, processor: 'paypal' },
  { pattern: /^PP\s*\*\s*/i, processor: 'paypal' },
  { pattern: /^AMZN\s*Mktp\s*/i, processor: 'amazon' },
  { pattern: /^AMAZON\s*MKTPLCE\s*/i, processor: 'amazon' },
  { pattern: /^GOOGLE\s*\*\s*/i, processor: 'google' },
  { pattern: /^APPLE\s*\.COM\/BILL\s*/i, processor: 'apple' },
  { pattern: /^UBER\s*\*\s*/i, processor: 'uber' },
  { pattern: /^LYFT\s*\*\s*/i, processor: 'lyft' },
  { pattern: /^DOORDASH\s*/i, processor: 'doordash' },
  { pattern: /^DD\s*\*\s*/i, processor: 'doordash' },
  { pattern: /^GRUBHUB\s*/i, processor: 'grubhub' },
  { pattern: /^IC\s*\*\s*/i, processor: 'instacart' },
  { pattern: /^WM\s*SUPERCENTER\s*/i, processor: 'walmart' },
  { pattern: /^COSTCO\s*WHSE\s*/i, processor: 'costco' },
  { pattern: /^POS\s+DEBIT\s+/i, processor: 'pos' },
  { pattern: /^CHECKCARD\s+/i, processor: 'debit' },
];

/** Trailing location / store number patterns. */
const TRAILING_PATTERNS: Array<{ pattern: RegExp; extract: (m: RegExpMatchArray) => Partial<ParsedDescriptor> }> = [
  {
    pattern: /\s+#(\d{1,6})\s*$/,
    extract: (m) => ({ storeNumber: m[1] }),
  },
  {
    pattern: /\s+([A-Z]{2})\s*$/,
    extract: (m) => ({ locationHint: m[1] }),
  },
  {
    pattern: /\s+([A-Za-z\s]+)\s+([A-Z]{2})\s*$/,
    extract: (m) => ({ locationHint: `${m[1]?.trim()}, ${m[2]}` }),
  },
  {
    pattern: /\s+\d{2}\/\d{2}\s*$/,
    extract: () => ({}),
  },
  {
    pattern: /\s+\d{10,}\s*$/,
    extract: () => ({}),
  },
];

/**
 * Parse a raw card statement descriptor into a clean merchant name.
 * Handles Square/Toast/Stripe prefixes, store numbers, and location suffixes.
 */
export function parseStatementDescriptor(raw: string): ParsedDescriptor {
  const parseNotes: string[] = [];
  let working = raw.trim();
  let processor: string | undefined;
  let confidence = 0.72;

  for (const { pattern, processor: proc } of PROCESSOR_PREFIXES) {
    if (pattern.test(working)) {
      working = working.replace(pattern, '').trim();
      processor = proc;
      parseNotes.push(`Stripped ${proc} processor prefix`);
      confidence = 0.82;
      break;
    }
  }

  let storeNumber: string | undefined;
  let locationHint: string | undefined;

  for (const { pattern, extract } of TRAILING_PATTERNS) {
    const match = working.match(pattern);
    if (match) {
      const extracted = extract(match);
      storeNumber = extracted.storeNumber ?? storeNumber;
      locationHint = extracted.locationHint ?? locationHint;
      working = working.replace(pattern, '').trim();
      parseNotes.push('Stripped trailing location/store suffix');
    }
  }

  working = working
    .replace(/\s{2,}/g, ' ')
    .replace(/\*+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const normalizedName = normalizeMerchantName(working);
  const merchantName = working || raw.trim();

  if (normalizedName.length >= 3) {
    confidence = Math.min(0.95, confidence + 0.05);
  }

  return {
    raw,
    cleaned: working,
    normalizedName,
    merchantName,
    processor,
    locationHint,
    storeNumber,
    confidence,
    parseNotes,
  };
}

/** Batch parse descriptors. */
export function parseStatementDescriptors(raw: string[]): ParsedDescriptor[] {
  return raw.map(parseStatementDescriptor);
}

/** Whether a string looks like a raw statement descriptor vs a clean merchant name. */
export function looksLikeStatementDescriptor(text: string): boolean {
  return (
    /^(SQ|TST|SP|PP|PAYPAL|AMZN|UBER|LYFT|DD|DOORDASH)\s*\*/i.test(text) ||
    /\s#\d{1,6}$/.test(text) ||
    /\s[A-Z]{2}$/.test(text) ||
    /CHECKCARD|POS DEBIT/i.test(text)
  );
}
