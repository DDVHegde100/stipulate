const WALLET_KEY = 'stipulate_wallet_cards';

export interface WalletCard {
  cardId: string;
  label: string;
}

export function getWalletCards(): WalletCard[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(WALLET_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as WalletCard[];
  } catch {
    return [];
  }
}

export function saveWalletCards(cards: WalletCard[]): void {
  localStorage.setItem(WALLET_KEY, JSON.stringify(cards));
}

export function addWalletCard(cardId: string, label: string): WalletCard[] {
  const cards = getWalletCards();
  if (cards.some((c) => c.cardId === cardId)) return cards;
  const next = [...cards, { cardId, label }];
  saveWalletCards(next);
  return next;
}

export function removeWalletCard(cardId: string): WalletCard[] {
  const next = getWalletCards().filter((c) => c.cardId !== cardId);
  saveWalletCards(next);
  return next;
}

export async function fetchCatalog(): Promise<Array<{ card_id: string; name: string }>> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
  const apiKey = process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'stip_dev_local_key_change_in_production';
  const response = await fetch(`${base}/cards?limit=50`, {
    headers: { 'X-API-Key': apiKey },
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { data: { cards: Array<{ card_id: string; name: string }> } };
  return json.data?.cards ?? [];
}
