import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { listCatalogCards } from '@/lib/stipulate';
import { colors } from '@/theme/colors';

export default function WalletScreen() {
  const { user } = useAuth();
  const { cards, loaded, addCard, removeCard } = useWallet();
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);

  useEffect(() => {
    void listCatalogCards().then(setCatalog);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Logo size={40} />
          <View style={styles.headerText}>
            <SectionHeader
              overline="Your wallet"
              title={`${cards.length} card${cards.length !== 1 ? 's' : ''} linked`}
              subtitle={user?.name ?? user?.email}
            />
          </View>
        </View>

        <GlassCard>
          <Text style={styles.cardLabel}>Linked cards ({cards.length})</Text>
          {!loaded && <Text style={styles.cardBody}>Loading wallet…</Text>}
          {loaded && cards.length === 0 && (
            <Text style={styles.cardBody}>No cards linked yet. Add one below.</Text>
          )}
          {cards.map((card) => (
            <View key={card.cardId} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.cardTitle}>{card.label}</Text>
                <Text style={styles.cardMeta}>{card.cardId}</Text>
              </View>
              <Pressable onPress={() => void removeCard(card.cardId)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </GlassCard>

        <GlassCard>
          <Text style={styles.cardLabel}>Add from catalog</Text>
          {catalog.map((card) => (
            <Pressable
              key={card.card_id}
              style={styles.addRow}
              onPress={() => void addCard(card.card_id, card.name)}
            >
              <Text style={styles.cardTitle}>{card.name}</Text>
              <Text style={styles.add}>+ Add</Text>
            </Pressable>
          ))}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 8 },
  headerText: { flex: 1 },
  cardLabel: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  cardMeta: { color: colors.textTertiary, fontSize: 12, marginTop: 2 },
  cardBody: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  rowText: { flex: 1 },
  remove: { color: '#f87171', fontSize: 14, fontWeight: '600' },
  addRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  add: { color: colors.accent, fontWeight: '600' },
});
