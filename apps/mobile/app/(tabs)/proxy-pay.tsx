import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { PurchaseForm, type PurchaseInput } from '@/components/PurchaseForm';
import { RouteResult } from '@/components/RouteResult';
import { SectionHeader } from '@/components/SectionHeader';
import { useWallet } from '@/hooks/useWallet';
import { listVaultedPaymentMethods, proxyPayPurchase, type ProxyPayResult } from '@/lib/proxy-pay';
import { colors } from '@/theme/colors';

const DEFAULT_PURCHASE: PurchaseInput = {
  merchantName: 'Starbucks',
  mcc: '5814',
  amountMinor: 1250,
};

export default function ProxyPayScreen() {
  const { cardIds } = useWallet();
  const [purchase, setPurchase] = useState<PurchaseInput>(DEFAULT_PURCHASE);
  const [paymentToken, setPaymentToken] = useState('pm_card_visa');
  const [vaulted, setVaulted] = useState<Array<{ id: string; paymentMethodId: string; last4: string | null }>>(
    [],
  );
  const [result, setResult] = useState<ProxyPayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listVaultedPaymentMethods().then(setVaulted).catch(() => {});
  }, []);

  const runProxyPay = useCallback(
    async (input: PurchaseInput = purchase) => {
      if (cardIds.length === 0) {
        setError('Add cards in Wallet first.');
        return;
      }

      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const defaultPm = vaulted.find((method) => method.paymentMethodId)?.paymentMethodId;
        const data = await proxyPayPurchase({
          merchantName: input.merchantName,
          mcc: input.mcc,
          amountMinor: input.amountMinor,
          userCardIds: cardIds,
          paymentMethodToken: paymentToken.trim() || defaultPm,
        });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Proxy pay failed');
      } finally {
        setLoading(false);
      }
    },
    [cardIds, paymentToken, purchase, vaulted],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          overline="Proxy pay"
          title="Route + charge"
          subtitle="Combines routing with a tokenized payment intent"
        />

        <GlassCard>
          <PurchaseForm
            initial={purchase}
            onSubmit={(next) => {
              setPurchase(next);
              void runProxyPay(next);
            }}
          />
          <TextInput
            style={styles.input}
            value={paymentToken}
            onChangeText={setPaymentToken}
            placeholder="Payment token (pm_…)"
            placeholderTextColor={colors.textTertiary}
          />
          {vaulted.length > 0 && (
            <Text style={styles.meta}>
              Vaulted default: •••• {vaulted.find((m) => m.last4)?.last4 ?? '????'}
            </Text>
          )}
          <View style={styles.buttonRow}>
            <Text style={styles.button} onPress={() => void runProxyPay()}>
              {loading ? 'Processing…' : 'Run proxy pay'}
            </Text>
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
        </GlassCard>

        {loading && <ActivityIndicator color={colors.accent} />}

        {result && (
          <GlassCard>
            <RouteResult
              recommendation={{
                merchant: purchase.merchantName,
                amount: purchase.amountMinor / 100,
                currency: 'USD',
                recommendedCard: result.routing.bestCardId,
                reason: `Est. reward $${(result.routing.estimatedRewardMinor / 100).toFixed(2)} · ${result.paymentIntent.mode ?? 'sandbox'}`,
                confidence: 1,
                factors: [],
              }}
            />
            <Text style={styles.meta}>
              Payment intent: {result.paymentIntent.id} ({result.paymentIntent.status})
            </Text>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  input: {
    marginTop: 12,
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  buttonRow: { marginTop: 12 },
  button: {
    backgroundColor: colors.accent,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  label: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  meta: { color: colors.textTertiary, fontSize: 12, marginTop: 8 },
  error: { color: '#f87171', marginTop: 8 },
});
