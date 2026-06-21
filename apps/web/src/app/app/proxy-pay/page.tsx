'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getWalletCards } from '../../../lib/wallet';
import { fetchPlatformStatus } from '../../../lib/platform-status';
import {
  addVaultedPaymentMethod,
  listVaultedPaymentMethods,
  proxyPayPurchase,
  removeVaultedPaymentMethod,
  type ProxyPayResult,
  type VaultedPaymentMethod,
} from '../../../lib/proxy-pay';

const MCC_PRESETS = [
  { label: 'Coffee shop', mcc: '5814', merchant: 'Starbucks' },
  { label: 'Restaurant', mcc: '5812', merchant: 'Local Bistro' },
  { label: 'Grocery', mcc: '5411', merchant: 'Whole Foods' },
] as const;

export default function ProxyPayPage() {
  const walletCards = useMemo(() => getWalletCards(), []);
  const [merchant, setMerchant] = useState('Starbucks');
  const [mcc, setMcc] = useState('5814');
  const [amount, setAmount] = useState(12.5);
  const [paymentMethods, setPaymentMethods] = useState<VaultedPaymentMethod[]>([]);
  const [selectedPmId, setSelectedPmId] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [newPmId, setNewPmId] = useState('pm_card_visa');
  const [result, setResult] = useState<ProxyPayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxyPayEnabled, setProxyPayEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchPlatformStatus()
      .then((status) => setProxyPayEnabled(status.features.proxyPay))
      .catch(() => setProxyPayEnabled(false));
  }, []);

  useEffect(() => {
    void listVaultedPaymentMethods()
      .then((methods) => {
        setPaymentMethods(methods);
        const defaultMethod = methods.find((m) => m.isDefault) ?? methods[0];
        if (defaultMethod) setSelectedPmId(defaultMethod.id);
      })
      .catch(() => {
        // Vault may be empty on first visit
      });
  }, []);

  async function handleVaultPm() {
    setError(null);
    try {
      const method = await addVaultedPaymentMethod({
        paymentMethodId: newPmId,
        label: 'Demo card',
        network: 'visa',
        last4: '4242',
        setDefault: paymentMethods.length === 0,
      });
      setPaymentMethods((prev) => [...prev.filter((m) => m.id !== method.id), method]);
      setSelectedPmId(method.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vault payment method');
    }
  }

  async function handleRemovePm(id: string) {
    setError(null);
    try {
      await removeVaultedPaymentMethod(id);
      setPaymentMethods((prev) => prev.filter((m) => m.id !== id));
      if (selectedPmId === id) setSelectedPmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove payment method');
    }
  }

  async function handleProxyPay() {
    if (walletCards.length === 0) {
      setError('Add cards to your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const selected = paymentMethods.find((m) => m.id === selectedPmId);
      const token = manualToken.trim() || selected?.paymentMethodId;
      const data = await proxyPayPurchase({
        merchantName: merchant,
        mcc,
        amountMinor: Math.round(amount * 100),
        userCardIds: walletCards.map((c) => c.cardId),
        paymentMethodToken: token || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proxy pay failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Text variant="overline" tone="secondary">
          Proxy pay
        </Text>
        <Heading as="h1" size="lg">
          Route + charge
        </Heading>
        <Text tone="secondary" className="mt-1">
          Combines card routing with a tokenized payment intent (sandbox or Stripe)
        </Text>
      </div>

      {proxyPayEnabled === false && (
        <GlassPanel data-testid="proxy-pay-disabled-gate">
          <Heading as="h2" size="sm">
            Proxy pay not enabled
          </Heading>
          <Text tone="secondary" className="mt-2">
            This API deployment has proxy pay disabled. Set `FEATURE_PROXY_PAY=true` and configure Stripe
            before using route + charge. See docs/PROXY_PAY.md.
          </Text>
        </GlassPanel>
      )}

      {proxyPayEnabled !== false && (
        <>
      {error && (
        <GlassPanel className="border-red-500/30">
          <Text tone="secondary">{error}</Text>
        </GlassPanel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <Heading as="h2" size="sm">
            Purchase
          </Heading>
          <div className="mt-4 flex flex-wrap gap-2">
            {MCC_PRESETS.map((preset) => (
              <Button
                key={preset.mcc}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMerchant(preset.merchant);
                  setMcc(preset.mcc);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" />
            <Input value={mcc} onChange={(e) => setMcc(e.target.value)} placeholder="MCC" />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Amount (USD)"
            />
            <Input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Optional payment token override"
            />
            <Button onClick={() => void handleProxyPay()} disabled={loading}>
              {loading ? 'Processing…' : 'Run proxy pay'}
            </Button>
          </div>
        </GlassPanel>

        <GlassPanel>
          <Heading as="h2" size="sm">
            Vaulted payment methods
          </Heading>
          <Text tone="secondary" className="mt-1">
            Default vaulted PM is used when no manual token is provided
          </Text>
          <div className="mt-4 space-y-2">
            {paymentMethods.length === 0 ? (
              <Text tone="secondary">No vaulted methods yet</Text>
            ) : (
              paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 hover:bg-glass-hover"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="vaulted-pm"
                      checked={selectedPmId === method.id}
                      onChange={() => setSelectedPmId(method.id)}
                    />
                    {method.label ?? method.paymentMethodId} •••• {method.last4 ?? '????'}
                    {method.isDefault && (
                      <span className="text-xs text-[var(--color-text-tertiary)]">default</span>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => void handleRemovePm(method.id)}>
                    Remove
                  </Button>
                </label>
              ))
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              value={newPmId}
              onChange={(e) => setNewPmId(e.target.value)}
              placeholder="pm_… or tok_…"
            />
            <Button variant="ghost" onClick={() => void handleVaultPm()}>
              Vault
            </Button>
          </div>
        </GlassPanel>
      </div>

      {result && (
        <GlassPanel>
          <Heading as="h2" size="sm">
            Result
          </Heading>
          <div className="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
            <p>
              Best card: <span className="text-white">{result.routing.bestCardId}</span>
            </p>
            <p>
              Est. reward: ${(result.routing.estimatedRewardMinor / 100).toFixed(2)}
            </p>
            <p>
              Payment intent: {result.paymentIntent.id} ({result.paymentIntent.status},{' '}
              {result.paymentIntent.mode ?? 'sandbox'})
            </p>
          </div>
        </GlassPanel>
      )}
        </>
      )}
    </div>
  );
}
