/**
 * Card catalog seed data generator and loader utilities.
 */
import type { Card, CardCatalog } from '../src/card.js';
import { CardCatalogSchema } from '../src/card.js';

export interface CardSeedEntry {
  id: string;
  issuer: string;
  productName: string;
  network: 'visa' | 'mastercard' | 'amex' | 'discover';
  annualFee: number;
  productTier?: string;
  benefitGuideUrl?: string;
}

/** Convert a flat seed entry into a Card object. */
export function seedEntryToCard(entry: CardSeedEntry): Card {
  return {
    id: entry.id,
    issuer: entry.issuer,
    productName: entry.productName,
    network: entry.network,
    annualFee: {
      amountMinor: Math.round(entry.annualFee * 100),
      currency: 'USD',
    },
    benefitRuleIds: [],
    benefitGuideUrl: entry.benefitGuideUrl,
    isActive: true,
    metadata: entry.productTier ? { productTier: entry.productTier } : undefined,
  };
}

/** Build a validated CardCatalog from seed entries. */
export function buildCatalog(
  version: string,
  entries: CardSeedEntry[],
  issuer?: string,
): CardCatalog {
  const catalog: CardCatalog = {
    version,
    generatedAt: new Date().toISOString(),
    issuer,
    cards: entries.map(seedEntryToCard),
  };
  return CardCatalogSchema.parse(catalog);
}

/** Issuer slug normalization for SQL seeding. */
export const ISSUER_SLUG_MAP: Record<string, string> = {
  Chase: 'chase',
  'American Express': 'amex',
  'Capital One': 'capital-one',
  Citi: 'citi',
  Discover: 'discover',
  'Bank of America': 'bank-of-america',
  'Wells Fargo': 'wells-fargo',
  'U.S. Bank': 'us-bank',
  Barclays: 'barclays',
  Apple: 'apple',
  Amazon: 'amazon',
};

/** Product tier templates for catalog expansion. */
export const PRODUCT_TIER_SUFFIXES = [
  '',
  ' Student',
  ' Secured',
  ' Business',
  ' Signature',
] as const;

/** Co-brand partner templates for airline/hotel card expansion. */
export const COBRAND_PARTNERS = [
  { suffix: ' United', slug: 'united', network: 'visa' as const },
  { suffix: ' Delta', slug: 'delta', network: 'amex' as const },
  { suffix: ' Southwest', slug: 'southwest', network: 'visa' as const },
  { suffix: ' Marriott', slug: 'marriott', network: 'amex' as const },
  { suffix: ' Hilton', slug: 'hilton', network: 'amex' as const },
  { suffix: ' Hyatt', slug: 'hyatt', network: 'visa' as const },
  { suffix: ' IHG', slug: 'ihg', network: 'mastercard' as const },
  { suffix: ' JetBlue', slug: 'jetblue', network: 'mastercard' as const },
  { suffix: ' Alaska', slug: 'alaska', network: 'visa' as const },
  { suffix: ' Avianca', slug: 'avianca', network: 'visa' as const },
  { suffix: ' Aeroplan', slug: 'aeroplan', network: 'mastercard' as const },
  { suffix: ' British Airways', slug: 'british_airways', network: 'visa' as const },
  { suffix: ' Amazon', slug: 'amazon', network: 'visa' as const },
  { suffix: ' Apple', slug: 'apple', network: 'mastercard' as const },
  { suffix: ' Costco', slug: 'costco', network: 'visa' as const },
] as const;

/** Expand base cards with tier and co-brand variants to reach target count. */
export function expandCatalogEntries(
  baseEntries: CardSeedEntry[],
  targetCount: number,
): CardSeedEntry[] {
  const seen = new Set<string>();
  const result: CardSeedEntry[] = [];

  const add = (entry: CardSeedEntry) => {
    if (seen.has(entry.id) || result.length >= targetCount) return;
    seen.add(entry.id);
    result.push(entry);
  };

  for (const entry of baseEntries) {
    add(entry);
  }

  for (const base of baseEntries) {
    for (const partner of COBRAND_PARTNERS) {
      if (result.length >= targetCount) break;
      const id = `${base.id.split('_')[0]}_${partner.slug}_${base.id.split('_').slice(1).join('_') || 'card'}`.slice(0, 64);
      add({
        id: id.replace(/__+/g, '_'),
        issuer: base.issuer,
        productName: `${base.productName}${partner.suffix}`,
        network: partner.network,
        annualFee: base.annualFee,
        productTier: 'co-brand',
      });
    }
  }

  for (const base of baseEntries) {
    for (const tier of PRODUCT_TIER_SUFFIXES) {
      if (!tier || result.length >= targetCount) continue;
      const tierSlug = tier.trim().toLowerCase().replace(/\s+/g, '_');
      add({
        id: `${base.id}_${tierSlug}`,
        issuer: base.issuer,
        productName: `${base.productName}${tier}`,
        network: base.network,
        annualFee: tier.includes('Secured') ? 0 : base.annualFee,
        productTier: tierSlug || undefined,
      });
    }
  }

  let counter = 0;
  while (result.length < targetCount) {
    const base = baseEntries[counter % baseEntries.length]!;
    add({
      id: `${base.id}_variant_${counter}`,
      issuer: base.issuer,
      productName: `${base.productName} Edition ${counter + 1}`,
      network: base.network,
      annualFee: base.annualFee,
      productTier: 'legacy',
    });
    counter++;
  }

  return result.slice(0, targetCount);
}
