import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RouteRecommendation } from '@stipulate/schema';

import { CapProgress } from '@/components/CapProgress';
import { GlassCard } from '@/components/GlassCard';
import { LatencyBadge } from '@/components/LatencyBadge';
import { PurchaseForm, type PurchaseInput } from '@/components/PurchaseForm';
import { ReceiptOcrPanel } from '@/components/ReceiptOcrPanel';
import { BatchRoutePanel } from '@/components/BatchRoutePanel';
import { RouteResult } from '@/components/RouteResult';
import { SectionHeader } from '@/components/SectionHeader';
import { useEnrich } from '@/hooks/useEnrich';
import { useWallet } from '@/hooks/useWallet';
import { recordRouteHistory } from '@/lib/route-history';
import { routePurchase, fetchSpendSummary } from '@/lib/stipulate';
import { colors } from '@/theme/colors';

const DEFAULT_PURCHASE: PurchaseInput = {
  merchantName: 'Starbucks',
  mcc: '5814',
  amountMinor: 650,
};

export default function RouteScreen() {
  const { cards, loaded, cardIds } = useWallet();
  const { enrich } = useEnrich();
  const [purchase, setPurchase] = useState<PurchaseInput>(DEFAULT_PURCHASE);
  const [recommendation, setRecommendation] = useState<RouteRecommendation | null>(null);
  const [ranked, setRanked] = useState<
    Array<{ cardId: string; rank: number; reasoning?: string; rewardMinor?: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [capRows, setCapRows] = useState<Array<{ label: string; spentMinor: number; capMinor: number }>>([]);

  useEffect(() => {
    if (!loaded || cardIds.length === 0) return;
    void fetchSpendSummary({ userRef: 'mobile-wallet', cardIds })
      .then((caps) =>
        setCapRows(
          caps.slice(0, 3).map((cap) => ({
            label: `${cap.category} (${cap.cardId})`,
            spentMinor: cap.spentMinor,
            capMinor: cap.category === 'groceries' ? 2_500_000 : 1_000_000,
          })),
        ),
      )
      .catch(() => {});
  }, [loaded, cardIds]);

  const fetchRoute = useCallback(
    async (input: PurchaseInput = purchase) => {
      if (cardIds.length === 0) {
        setRecommendation({
          merchant: input.merchantName,
          amount: input.amountMinor / 100,
          currency: 'USD',
          recommendedCard: null,
          reason: 'Add cards in Wallet to get live routing recommendations.',
          confidence: 0,
          factors: [],
        });
        setRanked([]);
        return;
      }

      setLoading(true);
      setError(null);
      const start = performance.now();

      try {
        const enrichment = await enrich({ merchantName: input.merchantName, mcc: input.mcc }).catch(() => null);

        const result = await routePurchase({
          merchantName: input.merchantName,
          mcc: input.mcc,
          amountMinor: input.amountMinor,
          userCardIds: cardIds,
        });

        setLatencyMs(Math.round(performance.now() - start));

        const best = result.rankedCards[0];
        const walletCard = cards.find((c) => c.cardId === result.bestCardId);

        setRanked(
          result.rankedCards.map((card) => ({
            cardId: card.cardId,
            rank: card.rank,
            reasoning: card.reasoning,
            rewardMinor: card.estimatedReward?.amountMinor,
          })),
        );

        setRecommendation({
          merchant: enrichment?.merchantName ?? result.merchantEnrichment?.merchantName ?? input.merchantName,
          amount: input.amountMinor / 100,
          currency: 'USD',
          recommendedCard: result.bestCardId,
          recommendedCardLabel: walletCard?.label ?? result.bestCardId,
          estimatedRewardMinor: best?.estimatedReward.amountMinor,
          reason: best?.reasoning ?? `Use ${walletCard?.label ?? result.bestCardId} for this purchase.`,
          confidence: enrichment?.confidence ?? result.merchantEnrichment?.confidence ?? 0.85,
          factors: (best?.factors ?? []).map((f) => ({ label: f.label, value: f.value })),
        });

        void recordRouteHistory({
          merchantName: input.merchantName,
          mcc: input.mcc,
          amountMinor: input.amountMinor,
          bestCardId: result.bestCardId,
          rewardMinor: best?.estimatedReward.amountMinor ?? 0,
        });
      } catch (err) {
        setLatencyMs(Math.round(performance.now() - start));
        setError(err instanceof Error ? err.message : 'Routing failed');
      } finally {
        setLoading(false);
      }
    },
    [cardIds, cards, enrich, purchase],
  );

  useEffect(() => {
    if (loaded) void fetchRoute(DEFAULT_PURCHASE);
  }, [loaded, fetchRoute]);

  const labelById = Object.fromEntries(cards.map((c) => [c.cardId, c.label]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <SectionHeader overline="Payment routing" title="Which card should you use?" />
          {latencyMs !== null ? <LatencyBadge ms={latencyMs} /> : null}
        </View>

        <GlassCard>
          <ReceiptOcrPanel
            onParsed={(parsed) => {
              const next: PurchaseInput = {
                merchantName: parsed.merchantName,
                mcc: parsed.mcc ?? purchase.mcc,
                amountMinor: parsed.amountMinor ?? purchase.amountMinor,
              };
              setPurchase(next);
              void fetchRoute(next);
            }}
          />
          <BatchRoutePanel cardIds={cardIds} labelById={labelById} />
          <PurchaseForm
            initial={purchase}
            onSubmit={(next) => {
              setPurchase(next);
              void fetchRoute(next);
            }}
          />
        </GlassCard>

        {loading && <ActivityIndicator color={colors.accent} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {recommendation && !loading && <RouteResult recommendation={recommendation} />}

        {ranked.length > 1 && (
          <GlassCard>
            <Text style={styles.cardLabel}>Full ranking</Text>
            {ranked.map((card) => (
              <View key={card.cardId} style={styles.rankRow}>
                <Text style={styles.rankNum}>#{card.rank}</Text>
                <View style={styles.rankBody}>
                  <Text style={styles.rankTitle}>{labelById[card.cardId] ?? card.cardId}</Text>
                  {card.rewardMinor !== undefined && (
                    <Text style={styles.rankMeta}>+${(card.rewardMinor / 100).toFixed(2)} est.</Text>
                  )}
                </View>
              </View>
            ))}
          </GlassCard>
        )}

        {capRows.map((cap) => (
          <CapProgress key={cap.label} label={cap.label} spentMinor={cap.spentMinor} capMinor={cap.capMinor} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  error: { color: '#f87171', fontSize: 14 },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rankNum: { color: colors.accent, fontWeight: '700', width: 28 },
  rankBody: { flex: 1 },
  rankTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rankMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
});
