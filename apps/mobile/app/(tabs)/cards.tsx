import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import {
  ensureCardholder,
  issueVirtualCard,
  listIssuingAuthorizations,
  listVirtualCards,
  updateVirtualCardStatus,
  type IssuingAuthorization,
  type VirtualCard,
} from '@/lib/issuing';
import { colors } from '@/theme/colors';

export default function CardsScreen() {
  const { user } = useAuth();
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [authorizations, setAuthorizations] = useState<IssuingAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const cardholderId = await ensureCardholder(user.id);
        const virtualCards = await listVirtualCards(user.id, cardholderId);
        setCards(virtualCards);
        const ledger = await listIssuingAuthorizations(user.id, cardholderId);
        setAuthorizations(ledger);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function handleIssueCard() {
    if (!user) return;
    setIssuing(true);
    setError(null);
    try {
      const cardholderId = await ensureCardholder(user.id);
      const card = await issueVirtualCard(user.id, cardholderId);
      setCards((prev) => [card, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue card');
    } finally {
      setIssuing(false);
    }
  }

  async function handleToggleFreeze(card: VirtualCard) {
    if (!user) return;
    setError(null);
    try {
      const nextStatus = card.status === 'frozen' ? 'active' : 'frozen';
      const updated = await updateVirtualCardStatus(user.id, card.id, nextStatus);
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: updated.status } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="cards-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader overline="Stipulate issuing" title="Virtual cards" />

        {error && (
          <GlassCard>
            <Text style={styles.error}>{error}</Text>
          </GlassCard>
        )}

        <Pressable style={styles.primaryButton} disabled={issuing || !user} onPress={() => void handleIssueCard()}>
          <Text style={styles.primaryButtonText}>{issuing ? 'Issuing…' : '+ Issue virtual card'}</Text>
        </Pressable>

        {loading ? (
          <Text style={styles.muted}>Loading cards…</Text>
        ) : cards.length === 0 ? (
          <GlassCard>
            <Text style={styles.muted}>No virtual cards yet. Issue one to get started.</Text>
          </GlassCard>
        ) : (
          cards.map((card) => (
            <GlassCard key={card.id}>
              <Text style={styles.network}>{card.network.toUpperCase()}</Text>
              <Text style={styles.last4}>•••• {card.last4}</Text>
              <Text style={styles.status}>{card.status}</Text>
              {card.status !== 'closed' && (
                <Pressable style={styles.outlineButton} onPress={() => void handleToggleFreeze(card)}>
                  <Text style={styles.outlineButtonText}>
                    {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                  </Text>
                </Pressable>
              )}
            </GlassCard>
          ))
        )}

        <GlassCard>
          <Text style={styles.cardLabel}>Authorization ledger</Text>
          {authorizations.length === 0 ? (
            <Text style={styles.muted}>No authorizations recorded yet.</Text>
          ) : (
            authorizations.map((auth) => (
              <View key={auth.id} style={styles.authRow}>
                <Text style={styles.authTitle}>
                  {auth.merchantName ?? auth.externalId} · ${(auth.amountMinor / 100).toFixed(2)}
                </Text>
                <Text style={styles.muted}>
                  {auth.status} · {new Date(auth.authorizedAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  network: { color: colors.textTertiary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  last4: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  status: { color: colors.textSecondary, textTransform: 'capitalize', marginTop: 4, marginBottom: 12 },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  outlineButtonText: { color: colors.text, fontWeight: '600' },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  authRow: { marginBottom: 12 },
  authTitle: { color: colors.text, fontWeight: '600' },
  muted: { color: colors.textSecondary },
  error: { color: '#f87171' },
});
