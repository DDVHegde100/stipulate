'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, Card, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getStoredUser, updateProfile } from '../../lib/consumer-auth';
import {
  addWalletCard,
  fetchCatalog,
  getWalletCards,
} from '../../lib/wallet';

const STEPS = ['Welcome', 'Add cards', 'Notifications'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState(getWalletCards());
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      router.replace('/signup');
      return;
    }
    if (user.onboardingComplete) {
      router.replace('/app/wallet');
    }
    void fetchCatalog().then(setCatalog);
  }, [router]);

  const filtered = catalog.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function finish() {
    const user = getStoredUser();
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, {
        walletCardIds: cards.map((c) => c.cardId),
        onboardingComplete: true,
        notificationPrefs: { email: emailNotifs, push: false },
      });
      router.push('/app/wallet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4 py-12">
      <Card className="w-full max-w-lg space-y-6 p-8">
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-accent-500' : 'bg-ink-800'
              }`}
            />
          ))}
        </div>

        <Text variant="overline" tone="secondary">
          Step {step + 1} of {STEPS.length}
        </Text>

        {step === 0 && (
          <>
            <Heading as="h1" size="md">
              Welcome to Stipulate
            </Heading>
            <Text tone="secondary">
              Add your cards, route every purchase to max return, and get alerts when benefits change.
            </Text>
            <Button className="w-full" onClick={() => setStep(1)}>
              Get started
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => void finish()}>
              Skip for now
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <Heading as="h1" size="md">
              Build your wallet
            </Heading>
            <Input
              placeholder="Search cards…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {filtered.slice(0, 8).map((card) => (
                <button
                  key={card.card_id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-glass-border px-4 py-3 text-left text-sm hover:bg-glass-surface"
                  onClick={() => setCards(addWalletCard(card.card_id, card.name))}
                >
                  <span className="text-white">{card.name}</span>
                  <span className="text-accent-400">+ Add</span>
                </button>
              ))}
            </div>
            {cards.length > 0 && (
              <GlassPanel>
                <Text variant="body-sm" tone="secondary">
                  {cards.length} card{cards.length !== 1 ? 's' : ''} added
                </Text>
              </GlassPanel>
            )}
            <Button className="w-full" onClick={() => setStep(2)} disabled={cards.length === 0}>
              Continue
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Heading as="h1" size="md">
              Stay in the loop
            </Heading>
            <label className="flex items-center gap-3 rounded-xl border border-glass-border p-4">
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={(e) => setEmailNotifs(e.target.checked)}
                className="h-4 w-4 accent-accent-500"
              />
              <div>
                <p className="text-sm font-medium text-white">Email benefit alerts</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Get notified when your cards&apos; benefits change
                </p>
              </div>
            </label>
            <Button className="w-full" onClick={() => void finish()} disabled={loading}>
              {loading ? 'Saving…' : 'Finish setup'}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
