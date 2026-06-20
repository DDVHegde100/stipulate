const WALLET_KEY = 'stipulate_wallet_cards';

export interface WalletCard {
  cardId: string;
  label: string;
}

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';
}

function apiKey(): string {
  return process.env.NEXT_PUBLIC_DEMO_API_KEY ?? 'stip_dev_local_key_change_in_production';
}

function walletHeaders(userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey(),
  };
  if (userId) headers['X-Consumer-User-Id'] = userId;
  return headers;
}

function walletFetchInit(userId?: string): RequestInit {
  return {
    headers: walletHeaders(userId),
    credentials: 'include',
  };
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

/** Load wallet from API when logged in, otherwise from local cache. */
export async function loadWalletCards(userId?: string): Promise<WalletCard[]> {
  if (typeof window === 'undefined') return [];

  if (userId) {
    try {
      const response = await fetch(`${apiBase()}/wallet/cards`, walletFetchInit(userId));
      if (response.ok) {
        const json = (await response.json()) as {
          data: { cards: Array<{ cardId: string; label: string }> };
        };
        const cards = (json.data?.cards ?? []).map((card) => ({
          cardId: card.cardId,
          label: card.label,
        }));
        saveWalletCards(cards);
        return cards;
      }
    } catch {
      // fall back to local cache
    }
  }

  return getWalletCards();
}

export async function addWalletCard(
  cardId: string,
  label: string,
  userId?: string,
): Promise<WalletCard[]> {
  if (userId) {
    try {
      const response = await fetch(`${apiBase()}/wallet/cards`, {
        method: 'POST',
        ...walletFetchInit(userId),
        body: JSON.stringify({ cardId, label }),
      });
      if (response.ok) {
        return loadWalletCards(userId);
      }
    } catch {
      // fall back to local storage
    }
  }

  const cards = getWalletCards();
  if (cards.some((c) => c.cardId === cardId)) return cards;
  const next = [...cards, { cardId, label }];
  saveWalletCards(next);
  return next;
}

export async function removeWalletCard(cardId: string, userId?: string): Promise<WalletCard[]> {
  if (userId) {
    try {
      const response = await fetch(`${apiBase()}/wallet/cards/${encodeURIComponent(cardId)}`, {
        method: 'DELETE',
        ...walletFetchInit(userId),
      });
      if (response.ok) {
        return loadWalletCards(userId);
      }
    } catch {
      // fall back to local storage
    }
  }

  const next = getWalletCards().filter((c) => c.cardId !== cardId);
  saveWalletCards(next);
  return next;
}

export async function fetchCatalog(): Promise<Array<{ card_id: string; name: string }>> {
  const response = await fetch(`${apiBase()}/cards?limit=50`, {
    headers: { 'X-API-Key': apiKey() },
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { data: { cards: Array<{ card_id: string; name: string }> } };
  return json.data?.cards ?? [];
}
