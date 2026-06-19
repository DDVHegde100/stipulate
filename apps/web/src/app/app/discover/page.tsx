'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, GlassPanel, Heading, Text } from '@stipulate/ui';

import { fetchCatalog, getWalletCards } from '../../../lib/wallet';

const CATEGORY_GAPS = [
  {
    category: 'Dining',
    description: '4× restaurants — Amex Gold leads for most wallets',
    suggest: 'amex_gold',
  },
  {
    category: 'Travel',
    description: '3× travel + transfer partners — Sapphire Preferred',
    suggest: 'chase_sapphire_preferred',
  },
  {
    category: 'Groceries',
    description: '4× US supermarkets up to $25K/yr — Amex Gold',
    suggest: 'amex_gold',
  },
  {
    category: 'Flat 2×',
    description: 'Simple everywhere earn — Capital One Venture',
    suggest: 'capital_one_venture',
  },
] as const;

export default function DiscoverPage() {
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const walletIds = useMemo(() => new Set(getWalletCards().map((c) => c.cardId)), []);

  useEffect(() => {
    void fetchCatalog().then(setCatalog);
  }, []);

  const catalogById = useMemo(
    () => Object.fromEntries(catalog.map((c) => [c.card_id, c.name])),
    [catalog],
  );

  const gaps = CATEGORY_GAPS.filter((gap) => !walletIds.has(gap.suggest));

  return (
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Card discovery
        </Text>
        <Heading as="h1" size="lg">
          Unlock better cards for your spend
        </Heading>
        <Text tone="secondary" className="mt-2 max-w-2xl">
          Based on your wallet, these cards fill category gaps and may improve net return on
          common purchase types.
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {gaps.map((gap) => (
          <GlassPanel key={gap.category} hover>
            <Text variant="overline" tone="secondary">
              {gap.category} gap
            </Text>
            <Heading as="h3" size="sm" className="mt-2">
              {catalogById[gap.suggest] ?? gap.suggest}
            </Heading>
            <Text tone="secondary" className="mt-2">
              {gap.description}
            </Text>
            <Link href="/app/wallet" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Add to wallet
              </Button>
            </Link>
          </GlassPanel>
        ))}
        {gaps.length === 0 && (
          <GlassPanel>
            <Text tone="secondary">
              Your wallet covers the top category recommendations. Nice work.
            </Text>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
