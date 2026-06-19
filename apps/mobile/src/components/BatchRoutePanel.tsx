import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/GlassCard';
import { colors } from '@/theme/colors';

const SAMPLE_PURCHASES = [
  { merchantName: 'Starbucks', mcc: '5814', amountMinor: 650 },
  { merchantName: 'Whole Foods', mcc: '5411', amountMinor: 4500 },
  { merchantName: 'Shell', mcc: '5541', amountMinor: 5200 },
] as const;

interface BatchResultRow {
  merchantName: string;
  bestCardId: string;
  rewardMinor: number;
}

interface BatchRoutePanelProps {
  cardIds: string[];
  labelById: Record<string, string>;
}

export function BatchRoutePanel({ cardIds, labelById }: BatchRoutePanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BatchResultRow[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  async function handleBatchRoute() {
    if (cardIds.length === 0) {
      setError('Add cards to your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    const start = Date.now();

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1'}/route/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.EXPO_PUBLIC_API_KEY ?? 'stip_dev_local_key_change_in_production',
          },
          body: JSON.stringify({
            sharedUserCardIds: cardIds,
            requests: SAMPLE_PURCHASES.map((purchase) => ({
              merchantName: purchase.merchantName,
              mcc: purchase.mcc,
              amount: { amountMinor: purchase.amountMinor, currency: 'USD' },
              userCardIds: cardIds,
            })),
          }),
        },
      );

      const json = (await response.json()) as {
        data: {
          results: Array<{
            bestCardId: string;
            rankedCards: Array<{ estimatedReward?: { amountMinor: number } }>;
          }>;
        };
        error?: { message: string };
      };

      if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);

      setResults(
        json.data.results.map((result, index) => ({
          merchantName: SAMPLE_PURCHASES[index]?.merchantName ?? `Purchase ${index + 1}`,
          bestCardId: result.bestCardId,
          rewardMinor: result.rankedCards[0]?.estimatedReward?.amountMinor ?? 0,
        })),
      );
      setLatencyMs(Date.now() - start);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch route failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setOpen(!open)}>
        <Text style={styles.toggle}>{open ? 'Hide batch route' : 'Batch route sample spend'}</Text>
      </Pressable>

      {open && (
        <GlassCard style={styles.panel}>
          <Text style={styles.hint}>Route coffee, groceries, and gas in one call.</Text>
          <Pressable style={styles.button} onPress={() => void handleBatchRoute()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Run batch</Text>
            )}
          </Pressable>
          {latencyMs !== null && <Text style={styles.latency}>{latencyMs}ms</Text>}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {results.map((row) => (
            <View key={row.merchantName} style={styles.row}>
              <Text style={styles.merchant}>{row.merchantName}</Text>
              <Text style={styles.pick}>
                {labelById[row.bestCardId] ?? row.bestCardId} · +${(row.rewardMinor / 100).toFixed(2)}
              </Text>
            </View>
          ))}
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  toggle: { color: colors.accentLight, fontSize: 14, marginBottom: 8 },
  panel: { gap: 10 },
  hint: { color: colors.textSecondary, fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  latency: { color: colors.textTertiary, fontSize: 12 },
  error: { color: '#f87171', fontSize: 13 },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
    paddingTop: 8,
    gap: 2,
  },
  merchant: { color: colors.text, fontWeight: '600', fontSize: 14 },
  pick: { color: colors.textSecondary, fontSize: 13 },
});
