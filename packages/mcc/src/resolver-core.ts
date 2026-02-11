import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  categoryFromMccDescription,
  normalizeMerchantName,
  type SpendingCategory,
} from '@stipulate/schema';

const MCC_REFERENCE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../data/mcc-reference.json',
);

export interface MccEntry {
  mcc: string;
  description: string;
  category: SpendingCategory;
  keywords: string[];
}

export interface MccMatchResult {
  mcc: string;
  description: string;
  category: SpendingCategory;
  score: number;
  matchedKeyword?: string;
}

export interface ResolveOptions {
  issuer?: string;
  minScore?: number;
  maxCandidates?: number;
}

const DEFAULT_MIN_SCORE = 0.55;
const DEFAULT_MAX_CANDIDATES = 5;

let cachedDatabase: MccEntry[] | undefined;

/** Load MCC reference entries from bundled JSON database. */
export function loadMccDatabase(): MccEntry[] {
  if (cachedDatabase) return cachedDatabase;
  const raw = readFileSync(MCC_REFERENCE_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as { entries: MccEntry[] };
  cachedDatabase = parsed.entries;
  return cachedDatabase;
}

/** Reset cached database — for tests. */
export function resetMccDatabaseCache(): void {
  cachedDatabase = undefined;
}

/** Tokenize a merchant name for fuzzy matching. */
export function tokenize(text: string): string[] {
  return normalizeMerchantName(text)
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

/** Compute Jaccard similarity between two token sets. */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Score a merchant name against an MCC entry using keyword and description matching. */
export function scoreMccMatch(merchantName: string, entry: MccEntry): MccMatchResult {
  const tokens = tokenize(merchantName);
  const normalizedMerchant = normalizeMerchantName(merchantName);
  let bestScore = 0;
  let matchedKeyword: string | undefined;

  for (const keyword of entry.keywords) {
    const keywordTokens = tokenize(keyword);
    const keywordNormalized = normalizeMerchantName(keyword);
    const tokenScore = jaccardSimilarity(tokens, keywordTokens);
    const substringScore = normalizedMerchant.includes(keywordNormalized) ? 0.85 : 0;
    const keywordScore = keywordNormalized.includes(normalizedMerchant) ? 0.75 : 0;
    const score = Math.max(tokenScore, substringScore, keywordScore);

    if (score > bestScore) {
      bestScore = score;
      matchedKeyword = keyword;
    }
  }

  const descriptionTokens = tokenize(entry.description);
  const descriptionScore = jaccardSimilarity(tokens, descriptionTokens);
  if (descriptionScore > bestScore) {
    bestScore = descriptionScore;
    matchedKeyword = entry.description;
  }

  return {
    mcc: entry.mcc,
    description: entry.description,
    category: entry.category,
    score: bestScore,
    matchedKeyword,
  };
}

/** Find top MCC matches for a merchant name. */
export function findMccMatches(
  merchantName: string,
  options: ResolveOptions = {},
): MccMatchResult[] {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const database = loadMccDatabase();

  return database
    .map((entry) => scoreMccMatch(merchantName, entry))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates);
}

/** Resolve MCC code directly from the reference database. */
export function resolveMccCode(mcc: string): MccEntry | undefined {
  return loadMccDatabase().find((entry) => entry.mcc === mcc);
}

/** Resolve category from MCC code directly. */
export function categoryFromMcc(mcc: string): SpendingCategory | undefined {
  const entry = resolveMccCode(mcc);
  return entry?.category ?? categoryFromMccDescription(mcc);
}
