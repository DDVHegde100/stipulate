import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useWallet } from '@/hooks/useWallet';
import { fetchChangelog, type ChangelogEntry } from '@/lib/stipulate';
import { colors } from '@/theme/colors';

export default function AlertsScreen() {
  const { cardIds } = useWallet();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [selected, setSelected] = useState<ChangelogEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cardId = cardIds[0];
    void fetchChangelog({ limit: 20, cardId })
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load alerts'));
  }, [cardIds]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader overline="Benefit alerts" title="What changed on your cards" />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {entries.map((entry) => (
          <Pressable key={entry.id} onPress={() => setSelected(entry)}>
            <GlassCard style={selected?.id === entry.id ? styles.selected : undefined}>
              <Text style={styles.severity}>{entry.severity}</Text>
              <Text style={styles.cardName}>{entry.card_name ?? entry.card_id}</Text>
              <Text style={styles.summary}>{entry.change_summary}</Text>
              <Text style={styles.meta}>
                v{entry.previous_version ?? '?'} → v{entry.version}
              </Text>
            </GlassCard>
          </Pressable>
        ))}

        {entries.length === 0 && !error && (
          <GlassCard>
            <Text style={styles.empty}>No benefit changes for your wallet cards yet.</Text>
          </GlassCard>
        )}

        {selected && (
          <GlassCard>
            <Text style={styles.cardLabel}>Diff</Text>
            <Text style={styles.diffOld}>- version {selected.previous_version ?? 'unknown'}</Text>
            <Text style={styles.diffNew}>+ version {selected.version}</Text>
            <Text style={styles.summary}>{selected.change_summary}</Text>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12 },
  error: { color: '#f87171' },
  selected: { borderColor: colors.accent },
  severity: { color: colors.accentLight, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  cardName: { color: colors.text, fontSize: 17, fontWeight: '600', marginTop: 6 },
  summary: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 6 },
  meta: { color: colors.textTertiary, fontSize: 12, marginTop: 8 },
  empty: { color: colors.textSecondary },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  diffOld: { color: '#fca5a5', fontFamily: 'Menlo', fontSize: 12 },
  diffNew: { color: '#86efac', fontFamily: 'Menlo', fontSize: 12, marginTop: 4 },
});
