import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { WalletCardSchema, type WalletCard } from '@stipulate/schema';

import { getStoredUser } from '@/lib/consumer-auth';
import { addWalletCardRemote, fetchWalletCards, removeWalletCardRemote } from '@/lib/stipulate';

const STORAGE_KEY = '@stipulate/wallet';

const DEFAULT_CARDS: WalletCard[] = [
  { cardId: 'chase_sapphire_preferred', label: 'Sapphire Preferred', addedAt: new Date().toISOString() },
  { cardId: 'amex_gold', label: 'Amex Gold', addedAt: new Date().toISOString() },
];

export function useWallet() {
  const [cards, setCards] = useState<WalletCard[]>(DEFAULT_CARDS);
  const [loaded, setLoaded] = useState(false);

  const persist = useCallback(async (next: WalletCard[]) => {
    setCards(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    void (async () => {
      const user = await getStoredUser();
      if (user) {
        const remote = await fetchWalletCards({ consumerUserId: user.id });
        if (remote.length > 0) {
          await persist(remote);
          setLoaded(true);
          return;
        }
      }

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as WalletCard[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCards(parsed.filter((c) => WalletCardSchema.safeParse(c).success));
          }
        } catch {
          // keep defaults
        }
      }
      setLoaded(true);
    })();
  }, [persist]);

  const addCard = useCallback(async (cardId: string, label: string) => {
    const user = await getStoredUser();
    if (user) {
      const ok = await addWalletCardRemote({
        consumerUserId: user.id,
        cardId,
        label,
      });
      if (ok) {
        const remote = await fetchWalletCards({ consumerUserId: user.id });
        if (remote.length > 0) {
          await persist(remote);
          return;
        }
      }
    }

    const next: WalletCard[] = [
      ...cards.filter((c) => c.cardId !== cardId),
      { cardId, label, addedAt: new Date().toISOString() },
    ];
    await persist(next);
  }, [cards, persist]);

  const removeCard = useCallback(async (cardId: string) => {
    const user = await getStoredUser();
    if (user) {
      const ok = await removeWalletCardRemote({ consumerUserId: user.id, cardId });
      if (ok) {
        const remote = await fetchWalletCards({ consumerUserId: user.id });
        await persist(remote);
        return;
      }
    }

    await persist(cards.filter((c) => c.cardId !== cardId));
  }, [cards, persist]);

  return { cards, loaded, addCard, removeCard, cardIds: cards.map((c) => c.cardId) };
}
