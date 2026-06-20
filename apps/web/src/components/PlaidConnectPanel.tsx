'use client';

import { useEffect, useState } from 'react';
import { Button, GlassPanel, Text } from '@stipulate/ui';

import { getStoredUser } from '../lib/consumer-auth';
import { addWalletCard, type WalletCard } from '../lib/wallet';
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  fetchPlaidLinkedAccounts,
  type PlaidLinkedAccount,
} from '../lib/plaid';

interface PlaidConnectPanelProps {
  onWalletChange?: (cards: WalletCard[]) => void;
}

export function PlaidConnectPanel({ onWalletChange }: PlaidConnectPanelProps) {
  const [linkedAccounts, setLinkedAccounts] = useState<PlaidLinkedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    void fetchPlaidLinkedAccounts(user.id).then(setLinkedAccounts);
  }, []);

  async function connectBank() {
    const user = getStoredUser();
    if (!user) {
      setError('Sign in to connect a bank account.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const link = await createPlaidLinkToken();
      if (link.mode === 'stub') {
        const result = await exchangePlaidPublicToken({
          publicToken: `public-sandbox-${Date.now()}`,
          institutionName: 'Chase',
          consumerUserId: user.id,
        });
        setMessage(`Linked ${result.accountsLinked} account(s) from ${link.mode} mode.`);
      } else {
        setMessage(link.message ?? 'Plaid Link will open when production keys are configured.');
      }

      const accounts = await fetchPlaidLinkedAccounts(user.id);
      setLinkedAccounts(accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bank linking failed');
    } finally {
      setLoading(false);
    }
  }

  async function addSuggestedCard(cardId: string, label: string) {
    const user = getStoredUser();
    const cards = await addWalletCard(cardId, label, user?.id);
    onWalletChange?.(cards);
    setMessage(`Added ${label} to your wallet.`);
  }

  const suggestions = linkedAccounts.filter((account) => account.mappedCardId);

  return (
    <GlassPanel className="space-y-4">
      <div>
        <Text variant="overline" tone="secondary">
          Bank linking
        </Text>
        <Text tone="secondary" className="mt-1">
          Connect your bank to auto-detect credit cards and add them to your wallet.
        </Text>
      </div>

      <Button onClick={() => void connectBank()} disabled={loading}>
        {loading ? 'Connecting…' : 'Connect bank account'}
      </Button>

      {message && <Text variant="body-sm" className="text-accent-400">{message}</Text>}
      {error && <Text variant="body-sm" className="text-red-400">{error}</Text>}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <Text variant="overline" tone="secondary">
            Suggested from linked accounts
          </Text>
          {suggestions.map((account) => (
            <div
              key={account.accountId}
              className="flex items-center justify-between rounded-lg border border-glass-border px-3 py-2"
            >
              <div>
                <Text variant="body-sm">{account.accountName ?? 'Credit card'}</Text>
                <Text variant="caption" tone="tertiary">
                  {account.institutionName}
                  {account.accountMask ? ` ·••• ${account.accountMask}` : ''}
                </Text>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void addSuggestedCard(
                    account.mappedCardId!,
                    account.accountName ?? account.mappedCardId!,
                  )
                }
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
