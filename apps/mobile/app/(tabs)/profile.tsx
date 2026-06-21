import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { fetchConsumerBillingStatus, startConsumerCheckout } from '@/lib/consumer-billing';
import { listCatalogCards } from '@/lib/stipulate';
import { syncPushToken } from '@/lib/push-notifications';
import { colors } from '@/theme/colors';

const CATEGORY_GAPS = [
  { category: 'Dining', description: '4× restaurants — Amex Gold', suggest: 'amex_gold' },
  { category: 'Travel', description: '3× travel — Sapphire Preferred', suggest: 'chase_sapphire_preferred' },
  { category: 'Groceries', description: '4× supermarkets — Amex Gold', suggest: 'amex_gold' },
] as const;

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const { cardIds } = useWallet();
  const [name, setName] = useState(user?.name ?? '');
  const [emailAlerts, setEmailAlerts] = useState(user?.notificationPrefs.email ?? true);
  const [pushAlerts, setPushAlerts] = useState(user?.notificationPrefs.push ?? false);
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billingStatus, setBillingStatus] = useState<Awaited<ReturnType<typeof fetchConsumerBillingStatus>> | null>(
    null,
  );
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    void listCatalogCards().then(setCatalog);
    void fetchConsumerBillingStatus()
      .then(setBillingStatus)
      .catch(() => setBillingStatus(null));
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmailAlerts(user.notificationPrefs.email);
      setPushAlerts(user.notificationPrefs.push);
    }
  }, [user]);

  const catalogById = useMemo(
    () => Object.fromEntries(catalog.map((c) => [c.card_id, c.name])),
    [catalog],
  );
  const walletSet = useMemo(() => new Set(cardIds), [cardIds]);
  const gaps = CATEGORY_GAPS.filter((g) => !walletSet.has(g.suggest));

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await refreshProfile({
        name,
        notificationPrefs: { email: emailAlerts, push: pushAlerts },
      });
      await syncPushToken(user.id, pushAlerts);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader overline="Account" title="Profile & discovery" />

        <GlassCard>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>
          <Text style={styles.label}>Display name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <View style={styles.switchRow}>
            <Text style={styles.value}>Email benefit alerts</Text>
            <Switch value={emailAlerts} onValueChange={setEmailAlerts} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.value}>Push benefit alerts</Text>
            <Switch value={pushAlerts} onValueChange={setPushAlerts} />
          </View>
          <Pressable style={styles.button} onPress={() => void handleSave()} disabled={saving}>
            <Text style={styles.buttonText}>{saved ? 'Saved!' : saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </GlassCard>

        <GlassCard>
          <Text style={styles.cardLabel}>Billing</Text>
          {billingStatus?.isPremium ? (
            <Text style={styles.gapDesc}>Consumer Premium is active.</Text>
          ) : (
            <Text style={styles.gapDesc}>Upgrade for full analytics and benefit alerts.</Text>
          )}
          {!billingStatus?.isPremium ? (
            <Pressable
              style={styles.button}
              disabled={billingLoading}
              onPress={() => {
                setBillingLoading(true);
                void startConsumerCheckout({
                  successUrl: 'https://stipulate.io/app/settings',
                  cancelUrl: 'https://stipulate.io/app/settings',
                })
                  .then((session) => Linking.openURL(session.url))
                  .catch(() => setBillingLoading(false))
                  .finally(() => setBillingLoading(false));
              }}
            >
              <Text style={styles.buttonText}>
                {billingLoading ? 'Opening checkout…' : 'Upgrade with Stripe'}
              </Text>
            </Pressable>
          ) : null}
        </GlassCard>

        <GlassCard>
          <Text style={styles.cardLabel}>Card discovery</Text>
          {gaps.map((gap) => (
            <View key={gap.suggest} style={styles.gapRow}>
              <Text style={styles.gapCategory}>{gap.category} gap</Text>
              <Text style={styles.gapTitle}>{catalogById[gap.suggest] ?? gap.suggest}</Text>
              <Text style={styles.gapDesc}>{gap.description}</Text>
            </View>
          ))}
          {gaps.length === 0 && (
            <Text style={styles.empty}>Your wallet covers the top recommendations.</Text>
          )}
        </GlassCard>

        <Pressable
          style={styles.logout}
          onPress={() => {
            void logout().then(() => router.replace('/login'));
          }}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 8 },
  value: { color: colors.text, fontSize: 15, marginBottom: 4 },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginTop: 6,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  button: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  gapRow: { marginBottom: 14 },
  gapCategory: { color: colors.textAccent, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  gapTitle: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  gapDesc: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  empty: { color: colors.textSecondary },
  logout: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#f87171', fontWeight: '600' },
});
