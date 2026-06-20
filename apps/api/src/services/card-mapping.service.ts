export interface CatalogCardRef {
  id: string;
  issuer: string;
  productName: string;
}

const ISSUER_ALIASES: Record<string, string[]> = {
  chase: ['chase', 'jpmorgan', 'jp morgan'],
  amex: ['american express', 'amex'],
  citi: ['citi', 'citibank'],
  'capital one': ['capital one', 'capitalone'],
  discover: ['discover'],
  'bank of america': ['bank of america', 'bofa', 'boa'],
  'wells fargo': ['wells fargo'],
  barclays: ['barclays'],
  'us bank': ['us bank', 'usbank'],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function issuerMatches(institutionName: string, issuer: string): boolean {
  const normalizedInstitution = normalize(institutionName);
  const normalizedIssuer = normalize(issuer);
  if (normalizedInstitution.includes(normalizedIssuer)) return true;

  const aliases = ISSUER_ALIASES[normalizedIssuer] ?? [normalizedIssuer];
  return aliases.some((alias) => normalizedInstitution.includes(alias));
}

/** Heuristic match from bank account metadata to catalog card id. */
export function suggestCatalogCardId(input: {
  institutionName?: string;
  accountName?: string;
  catalog: CatalogCardRef[];
}): { cardId: string | null; confidence: number } {
  const institutionName = input.institutionName ?? '';
  const accountName = input.accountName ?? '';
  if (!institutionName && !accountName) {
    return { cardId: null, confidence: 0 };
  }

  const normalizedAccount = normalize(accountName);
  let best: { cardId: string; confidence: number } | null = null;

  for (const card of input.catalog) {
    if (institutionName && !issuerMatches(institutionName, card.issuer)) continue;

    const normalizedProduct = normalize(card.productName);
    let confidence = institutionName ? 0.55 : 0.45;

    if (normalizedAccount.includes(normalizedProduct)) {
      confidence = 0.92;
    } else {
      const productTokens = normalizedProduct.split(' ').filter((token) => token.length > 2);
      const matchedTokens = productTokens.filter((token) => normalizedAccount.includes(token));
      if (matchedTokens.length > 0) {
        confidence = Math.min(0.85, 0.55 + matchedTokens.length * 0.1);
      }
    }

    if (!best || confidence > best.confidence) {
      best = { cardId: card.id, confidence };
    }
  }

  if (!best || best.confidence < 0.5) {
    return { cardId: null, confidence: 0 };
  }

  return best;
}
