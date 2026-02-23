const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

export interface RouteApiResponse {
  bestCardId: string;
  rankedCards: Array<{
    cardId: string;
    rank: number;
    score: number;
    estimatedReward: { amountMinor: number; currency: string };
    factors: Array<{ label: string; value: string | number }>;
    reasoning?: string;
  }>;
  merchantEnrichment?: { merchantName: string; category: string; confidence: number };
}

export async function routePurchase(input: {
  merchantName: string;
  amountMinor: number;
  userCardIds: string[];
  mcc?: string;
}): Promise<RouteApiResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const response = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      merchantName: input.merchantName,
      mcc: input.mcc,
      amount: { amountMinor: input.amountMinor, currency: 'USD' },
      userCardIds: input.userCardIds,
      trackSpend: true,
      userRef: 'mobile-wallet',
    }),
  });

  if (!response.ok) {
    throw new Error(`Route API failed: ${response.status}`);
  }

  const envelope = await response.json() as { data: RouteApiResponse };
  return envelope.data;
}

export async function listCatalogCards(): Promise<Array<{ card_id: string; name: string }>> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const response = await fetch(`${API_BASE}/cards?limit=25`, { headers });
  if (!response.ok) return [];

  const envelope = await response.json() as { data: { cards: Array<{ card_id: string; name: string }> } };
  return envelope.data.cards;
}
