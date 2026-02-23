import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteRecommendation } from '@stipulate/schema';

import { RouteResult } from '@/components/RouteResult';
import { useWallet } from '@/hooks/useWallet';
import { routePurchase } from '@/lib/stipulate';
import { colors } from '@/theme/colors';

const DEMO_PURCHASE = {
  merchantName: 'Starbucks',
  mcc: '5814',
  amountMinor: 650,
};

export default function RouteScreen() {
  const { cards, loaded, cardIds } = useWallet();
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (cardIds.length === 0) {
      setRecommendation({
        merchant: DEMO_PURCHASE.merchantName,
        amount: DEMO_PURCHASE.amountMinor / 100,
        currency: 'USD',
        recommendedCard: null,
        reason: 'Add cards in Wallet to get live routing recommendations.',
        confidence: 0,
        factors: [],
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await routePurchase({
        merchantName: DEMO_PURCHASE.merchantName,
        mcc: DEMO_PURCHASE.mcc,
        amountMinor: DEMO_PURCHASE.amountMinor,
        userCardIds: cardIds,
      });

      const best = result.rankedCards[0];
      const walletCard = cards.find((c) => c.cardId === result.bestCardId);

      setRecommendation({
        merchant: result.merchantEnrichment?.merchantName ?? DEMO_PURCHASE.merchantName,
        amount: DEMO_PURCHASE.amountMinor / 100,
        currency: 'USD',
        recommendedCard: result.bestCardId,
        recommendedCardLabel: walletCard?.label ?? result.bestCardId,
        estimatedRewardMinor: best?.estimatedReward.amountMinor,
        reason: best?.reasoning ?? `Use ${walletCard?.label ?? result.bestCardId} for this purchase.`,
        confidence: result.merchantEnrichment?.confidence ?? 0.85,
        factors: (best?.factors ?? []).map((f) => ({ label: f.label, value: f.value })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed');
    } finally {
      setLoading(false);
    }
  }, [cardIds, cards]);

  useEffect(() => {
    if (loaded) void fetchRoute();
  }, [loaded, fetchRoute]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Payment routing</Text>
        <Text style={styles.title}>Route the payment</Text>

        {loading && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {recommendation && !loading && <RouteResult recommendation={recommendation} />}

        <Pressable style={styles.button} onPress={() => void fetchRoute()}>
          <Text style={styles.buttonText}>Refresh recommendation</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  eyebrow: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  error: { color: '#f87171', fontSize: 14 },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
