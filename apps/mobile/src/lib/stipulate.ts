import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string; apiKey?: string } | undefined;

const API_BASE = extra?.apiUrl ?? 'http://localhost:3000/v1';
const API_KEY = extra?.apiKey ?? '';

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

export async function enrichMerchant(input: { merchantName: string; mcc?: string }): Promise<{
  merchantName: string;
  category: string;
  mcc?: string;
  confidence: number;
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const response = await fetch(`${API_BASE}/enrich`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Enrich API failed: ${response.status}`);
  }

  const envelope = (await response.json()) as {
    data: { enrichment: { merchantName: string; category: string; mcc?: string; confidence: number } };
  };
  return envelope.data.enrichment;
}

export async function fetchSpendSummary(input: {
  userRef: string;
  cardIds: string[];
}): Promise<Array<{ cardId: string; category: string; capPeriod: string; spentMinor: number }>> {
  const params = new URLSearchParams({
    user_ref: input.userRef,
    card_ids: input.cardIds.join(','),
  });
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const response = await fetch(`${API_BASE}/spend/summary?${params}`, { headers });
  if (!response.ok) return [];

  const envelope = (await response.json()) as {
    data: { caps: Array<{ cardId: string; category: string; capPeriod: string; spentMinor: number }> };
  };
  return envelope.data.caps;
}

export async function listCatalogCards(): Promise<Array<{ card_id: string; name: string }>> {
  const headers: Record<string, string> = {};
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  const response = await fetch(`${API_BASE}/cards?limit=25`, { headers });
  if (!response.ok) return [];

  const envelope = await response.json() as { data: { cards: Array<{ card_id: string; name: string }> } };
  return envelope.data.cards;
}
