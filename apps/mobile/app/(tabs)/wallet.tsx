import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { listCatalogCards } from '@/lib/stipulate';
import { syncPlaidTransactions } from '@/lib/plaid';
import { PlaidConnectButton } from '@/components/PlaidConnectButton';
import { colors } from '@/theme/colors';

export default function WalletScreen() {
  const { user } = useAuth();
  const { cards, loaded, addCard, removeCard } = useWallet();
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const [bankMessage, setBankMessage] = useState<string | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  useEffect(() => {
    void listCatalogCards().then(setCatalog);
  }, []);

  async function handleLinked(result: {
    accountsLinked: number;
    suggestedCards: Array<{ accountName: string; cardId: string }>;
  }) {
    if (!user) return;
    try {
      for (const suggestion of result.suggestedCards.slice(0, 2)) {
        await addCard(suggestion.cardId, suggestion.accountName);
      }
      const synced = await syncPlaidTransactions(user.id);
      setBankMessage(
        `Linked ${result.accountsLinked} account(s) and synced ${synced.imported} spend row(s).`,
      );
    } catch {
      setBankMessage('Bank linking failed. Try again later.');
    } finally {
      setBankLoading(false);
    }
  }

  const showEmptyState = loaded && cards.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="wallet-screen">
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

        {showEmptyState ? (
          <View testID="wallet-empty-state">
            <GlassCard>
              <Text style={styles.emptyTitle}>Link your bank to get started</Text>
            <Text style={styles.cardBody}>
              Connect your bank to detect cards automatically and sync recent spend for cap tracking.
            </Text>
            <PlaidConnectButton
              consumerUserId={user?.id ?? ''}
              onLinked={(result) => {
                setBankLoading(true);
                setBankMessage(null);
                void handleLinked(result);
              }}
              onError={(message) => {
                setBankMessage(message);
                setBankLoading(false);
              }}
            />
            {bankMessage ? <Text style={styles.cardMeta}>{bankMessage}</Text> : null}
            {bankLoading ? <Text style={styles.cardMeta}>Linking accounts…</Text> : null}
            </GlassCard>
          </View>
        ) : (
          <View testID="wallet-bank-link-section">
            <GlassCard>
              <Text style={styles.cardLabel}>Bank linking</Text>
            <Text style={styles.cardBody}>
              Connect your bank to detect cards and sync recent spend for cap tracking.
            </Text>
            <PlaidConnectButton
              consumerUserId={user?.id ?? ''}
              onLinked={(result) => {
                setBankLoading(true);
                setBankMessage(null);
                void handleLinked(result);
              }}
              onError={(message) => {
                setBankMessage(message);
                setBankLoading(false);
              }}
            />
            {bankMessage ? <Text style={styles.cardMeta}>{bankMessage}</Text> : null}
            </GlassCard>
          </View>
        )}

        <GlassCard>
          <Text style={styles.cardLabel}>Linked cards ({cards.length})</Text>
          {!loaded && <Text style={styles.cardBody}>Loading wallet…</Text>}
          {showEmptyState && (
            <Text style={styles.cardBody}>No cards linked yet — connect your bank above or add from the catalog.</Text>
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
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
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
