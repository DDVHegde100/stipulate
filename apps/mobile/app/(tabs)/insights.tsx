import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CapProgress } from '@/components/CapProgress';
import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useWallet } from '@/hooks/useWallet';
import { estimateMissedRewards, getRouteHistory } from '@/lib/route-history';
import { fetchSpendSummary } from '@/lib/stipulate';
import { colors } from '@/theme/colors';

const CAP_LIMITS: Record<string, number> = {
  groceries: 2_500_000,
  dining: 1_000_000,
  travel: 1_500_000,
  default: 1_000_000,
};

export default function InsightsScreen() {
  const { cardIds, loaded } = useWallet();
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getRouteHistory>>>([]);
  const [caps, setCaps] = useState<
    Array<{ cardId: string; category: string; spentMinor: number }>
  >([]);

  useEffect(() => {
    void getRouteHistory().then(setHistory);
  }, []);

  useEffect(() => {
    if (!loaded || cardIds.length === 0) return;
    void fetchSpendSummary({ userRef: 'mobile-wallet', cardIds })
      .then((rows) => setCaps(rows))
      .catch(() => {});
  }, [loaded, cardIds]);

  const missedMinor = estimateMissedRewards(history);
  const categoryTotals = useMemo(
    () =>
      history.reduce<Record<string, number>>((acc, entry) => {
        const key = entry.mcc.startsWith('54') ? 'groceries' : entry.mcc.startsWith('58') ? 'dining' : 'other';
        acc[key] = (acc[key] ?? 0) + entry.amountMinor;
        return acc;
      }, {}),
    [history],
  );
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCategory = categoryEntries[0]?.[1] ?? 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader overline="Spend analytics" title="Rewards overview" />

        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Missed rewards</Text>
            <Text style={styles.statValue}>${(missedMinor / 100).toFixed(2)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>Routes</Text>
            <Text style={styles.statValue}>{history.length}</Text>
          </GlassCard>
        </View>

        <GlassCard>
          <Text style={styles.cardLabel}>Spend by category</Text>
          {categoryEntries.map(([cat, total]) => (
            <View key={cat} style={styles.barBlock}>
              <View style={styles.barHeader}>
                <Text style={styles.barTitle}>{cat}</Text>
                <Text style={styles.barAmount}>${(total / 100).toFixed(2)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((total / maxCategory) * 100)}%` }]} />
              </View>
            </View>
          ))}
          {categoryEntries.length === 0 && (
            <Text style={styles.empty}>Route purchases to see category breakdown.</Text>
          )}
        </GlassCard>

        {caps.map((cap) => (
          <CapProgress
            key={`${cap.cardId}-${cap.category}`}
            label={`${cap.category} · ${cap.cardId}`}
            spentMinor={cap.spentMinor}
            capMinor={CAP_LIMITS[cap.category] ?? CAP_LIMITS.default!}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1 },
  statLabel: { color: colors.textTertiary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 8 },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  barBlock: { marginBottom: 12 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barTitle: { color: colors.text, textTransform: 'capitalize' },
  barAmount: { color: colors.textSecondary },
  track: { height: 8, borderRadius: 999, backgroundColor: colors.backgroundElevated },
  fill: { height: 8, borderRadius: 999, backgroundColor: colors.accent },
  empty: { color: colors.textSecondary },
});
