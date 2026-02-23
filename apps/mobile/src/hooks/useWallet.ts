import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { WalletCardSchema, type WalletCard } from '@stipulate/schema';

const STORAGE_KEY = '@stipulate/wallet';

const DEFAULT_CARDS: WalletCard[] = [
  { cardId: 'chase_sapphire_preferred', label: 'Sapphire Preferred', addedAt: new Date().toISOString() },
  { cardId: 'amex_gold', label: 'Amex Gold', addedAt: new Date().toISOString() },
];

export function useWallet() {
  const [cards, setCards] = useState<WalletCard[]>(DEFAULT_CARDS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
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
    });
  }, []);

  const persist = useCallback(async (next: WalletCard[]) => {
    setCards(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addCard = useCallback(async (cardId: string, label: string) => {
    const next: WalletCard[] = [
      ...cards.filter((c) => c.cardId !== cardId),
      { cardId, label, addedAt: new Date().toISOString() },
    ];
    await persist(next);
  }, [cards, persist]);

  const removeCard = useCallback(async (cardId: string) => {
    await persist(cards.filter((c) => c.cardId !== cardId));
  }, [cards, persist]);

  return { cards, loaded, addCard, removeCard, cardIds: cards.map((c) => c.cardId) };
}
