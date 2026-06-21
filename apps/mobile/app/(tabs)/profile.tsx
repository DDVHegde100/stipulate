import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { PremiumGate } from '@/components/PremiumGate';
import { SectionHeader } from '@/components/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/hooks/useWallet';
import { fetchConsumerBillingStatus, startConsumerCheckout, startConsumerPortal } from '@/lib/consumer-billing';
import { downloadConsumerExport, scheduleConsumerDeletion, fetchConsumerDeletionStatus, cancelConsumerDeletion } from '@/lib/consumer-auth';
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
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{ scheduledFor: string } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    void listCatalogCards().then(setCatalog);
    void fetchConsumerBillingStatus()
      .then(setBillingStatus)
      .catch(() => setBillingStatus(null));
    void fetchConsumerDeletionStatus()
      .then(setDeletionStatus)
      .catch(() => setDeletionStatus(null));
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
            <Text style={styles.gapDesc}>
              Consumer Premium is active ({billingStatus.status}).
            </Text>
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
          ) : (
            <Pressable
              style={styles.outlineButton}
              disabled={billingLoading}
              onPress={() => {
                setBillingLoading(true);
                void startConsumerPortal({ returnUrl: 'https://stipulate.io/app/settings' })
                  .then((session) => Linking.openURL(session.url))
                  .catch(() => setBillingLoading(false))
                  .finally(() => setBillingLoading(false));
              }}
            >
              <Text style={styles.outlineButtonText}>
                {billingLoading ? 'Opening portal…' : 'Manage subscription'}
              </Text>
            </Pressable>
          )}
        </GlassCard>

        <GlassCard>
          <PremiumGate feature="Card discovery recommendations">
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
          </PremiumGate>
        </GlassCard>

        <GlassCard>
          <Text style={styles.cardLabel}>Privacy</Text>
          <Text style={styles.gapDesc}>
            Download a JSON bundle of your profile, wallet, linked accounts, and subscription data.
          </Text>
          <Pressable
            style={styles.button}
            disabled={exportLoading}
            onPress={() => {
              setExportLoading(true);
              void downloadConsumerExport()
                .then((bundle) =>
                  Share.share({
                    message: JSON.stringify(bundle, null, 2),
                    title: 'Stipulate data export',
                  }),
                )
                .catch(() => Alert.alert('Export failed', 'Try again later.'))
                .finally(() => setExportLoading(false));
            }}
          >
            <Text style={styles.buttonText}>
              {exportLoading ? 'Preparing export…' : 'Download my data'}
            </Text>
          </Pressable>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => void Linking.openURL('https://stipulate.io/privacy')}>
              <Text style={styles.link}>Privacy policy</Text>
            </Pressable>
            <Text style={styles.linkSep}>·</Text>
            <Pressable onPress={() => void Linking.openURL('https://stipulate.io/terms')}>
              <Text style={styles.link}>Terms of service</Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={[styles.cardLabel, styles.dangerLabel]}>Delete account</Text>
          <Text style={styles.gapDesc}>
            Permanently delete your account after a 30-day grace period. You will be signed out
            immediately.
          </Text>
          {deletionStatus ? (
            <>
              <Text style={styles.gapDesc}>
                Deletion scheduled for {new Date(deletionStatus.scheduledFor).toLocaleDateString()}.
              </Text>
              <Pressable
                style={styles.button}
                disabled={cancelLoading}
                onPress={() => {
                  setCancelLoading(true);
                  void cancelConsumerDeletion()
                    .then(() => setDeletionStatus(null))
                    .catch(() => Alert.alert('Cancel failed', 'Try again later.'))
                    .finally(() => setCancelLoading(false));
                }}
              >
                <Text style={styles.buttonText}>
                  {cancelLoading ? 'Cancelling…' : 'Cancel scheduled deletion'}
                </Text>
              </Pressable>
            </>
          ) : (
          <Pressable
            style={styles.dangerButton}
            disabled={deleteLoading}
            onPress={() => {
              Alert.alert(
                'Schedule account deletion?',
                'Your data will be purged after 30 days. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete account',
                    style: 'destructive',
                    onPress: () => {
                      setDeleteLoading(true);
                      void scheduleConsumerDeletion()
                        .then(() => router.replace('/login'))
                        .catch(() => Alert.alert('Deletion failed', 'Try again later.'))
                        .finally(() => setDeleteLoading(false));
                    },
                  },
                ],
              );
            }}
          >
            <Text style={styles.dangerButtonText}>
              {deleteLoading ? 'Scheduling…' : 'Schedule account deletion'}
            </Text>
          </Pressable>
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
  outlineButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  outlineButtonText: { color: colors.text, fontWeight: '600' },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, gap: 8 },
  link: { color: colors.accentLight, fontSize: 14 },
  linkSep: { color: colors.textTertiary, fontSize: 14 },
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
  dangerLabel: { color: '#f87171' },
  dangerButton: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#f87171',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#f87171', fontWeight: '600' },
  logout: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#f87171', fontWeight: '600' },
});
