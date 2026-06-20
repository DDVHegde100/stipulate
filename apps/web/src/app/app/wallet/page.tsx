'use client';

import { useEffect, useState } from 'react';
import { Button, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getStoredUser } from '../../../lib/consumer-auth';
import {
  addWalletCard,
  fetchCatalog,
  loadWalletCards,
  removeWalletCard,
  type WalletCard,
} from '../../../lib/wallet';

const CATEGORY_COLORS: Record<string, string> = {
  dining: 'bg-orange-500/20 text-orange-300',
  travel: 'bg-blue-500/20 text-blue-300',
  groceries: 'bg-green-500/20 text-green-300',
  other: 'bg-ink-700 text-[var(--color-text-secondary)]',
};

export default function WalletPage() {
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    void loadWalletCards(user?.id).then(setCards);
    void fetchCatalog().then(setCatalog);
  }, []);

  const user = getStoredUser();
  const filtered = catalog.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      !cards.some((w) => w.cardId === c.card_id),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Text variant="overline" tone="secondary">
            Your wallet
          </Text>
          <Heading as="h1" size="lg">
            {cards.length} card{cards.length !== 1 ? 's' : ''} linked
          </Heading>
          {user?.name && (
            <Text tone="secondary" className="mt-1">
              {user.name}
            </Text>
          )}
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Done' : '+ Add card'}</Button>
      </div>

      {showAdd && (
        <GlassPanel>
          <Input
            placeholder="Search 200+ cards…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4"
          />
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {filtered.slice(0, 10).map((card) => (
              <button
                key={card.card_id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-glass-hover"
                onClick={() => {
                  const user = getStoredUser();
                  void addWalletCard(card.card_id, card.name, user?.id).then(setCards);
                }}
              >
                <span className="text-white">{card.name}</span>
                <span className="text-accent-400">Add</span>
              </button>
            ))}
          </div>
        </GlassPanel>
      )}

      {cards.length === 0 ? (
        <GlassPanel className="text-center py-12">
          <Text tone="secondary">No cards yet. Add one to get routing recommendations.</Text>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <GlassPanel key={card.cardId} hover className="flex flex-col">
              <div className="mb-3 flex items-start justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS.other}`}
                >
                  rewards
                </span>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline"
                  onClick={() => {
                    const user = getStoredUser();
                    void removeWalletCard(card.cardId, user?.id).then(setCards);
                  }}
                >
                  Remove
                </button>
              </div>
              <Heading as="h3" size="sm" className="mb-1">
                {card.label}
              </Heading>
              <Text variant="caption" tone="tertiary">
                {card.cardId}
              </Text>
              <a href="/app/route" className="mt-4 text-sm text-accent-400 hover:underline">
                Which card? →
              </a>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
