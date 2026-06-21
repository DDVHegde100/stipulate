import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { listCatalogCards } from '@/lib/stipulate';
import { syncPushToken, obtainPushToken } from '@/lib/push-notifications';
import { colors } from '@/theme/colors';

const STEPS = ['Welcome', 'Add cards', 'Notifications'] as const;

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const { cards, addCard } = useWallet();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<Array<{ card_id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.onboardingComplete) {
      router.replace('/(tabs)/wallet');
    }
    void listCatalogCards().then(setCatalog);
  }, [user]);

  const filtered = catalog.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handlePushToggle(enabled: boolean) {
    if (!enabled) {
      setPushNotifs(false);
      return;
    }

    const token = await obtainPushToken();
    if (!token) {
      Alert.alert(
        'Notifications disabled',
        'Enable notifications in Settings to receive benefit change alerts on this device.',
      );
      setPushNotifs(false);
      return;
    }

    setPushNotifs(true);
  }

  async function finish() {
    if (!user) return;
    setLoading(true);
    try {
      await refreshProfile({
        onboardingComplete: true,
        walletCardIds: cards.map((c) => c.cardId),
        notificationPrefs: { email: emailNotifs, push: pushNotifs },
      });
      if (pushNotifs) {
        await syncPushToken(user.id, true);
      }
      router.replace('/(tabs)/wallet');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} testID="onboarding-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          overline="Onboarding"
          title={STEPS[step] ?? 'Setup'}
          subtitle={`Step ${step + 1} of ${STEPS.length}`}
        />

        {step === 0 && (
          <GlassCard>
            <Text style={styles.body}>
              Stipulate parses card fine print and routes every purchase to the card that earns the
              most. Let&apos;s set up your wallet.
            </Text>
            <Pressable style={styles.button} onPress={() => setStep(1)}>
              <Text style={styles.buttonText}>Get started</Text>
            </Pressable>
          </GlassCard>
        )}

        {step === 1 && (
          <GlassCard>
            <TextInput
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              placeholder="Search 200+ cards…"
              placeholderTextColor={colors.textTertiary}
            />
            <View style={styles.list}>
              {filtered.slice(0, 8).map((card) => (
                <Pressable
                  key={card.card_id}
                  style={styles.row}
                  onPress={() => void addCard(card.card_id, card.name)}
                >
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.add}>Add</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.meta}>{cards.length} card{cards.length !== 1 ? 's' : ''} selected</Text>
            <Pressable style={styles.button} onPress={() => setStep(2)}>
              <Text style={styles.buttonText}>Continue</Text>
            </Pressable>
          </GlassCard>
        )}

        {step === 2 && (
          <GlassCard>
            <View style={styles.switchRow}>
              <Text style={styles.body}>Email benefit change alerts</Text>
              <Switch value={emailNotifs} onValueChange={setEmailNotifs} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.body}>Push benefit change alerts</Text>
              <Switch
                testID="onboarding-push-toggle"
                value={pushNotifs}
                onValueChange={(value) => void handlePushToggle(value)}
              />
            </View>
            <Pressable style={styles.button} testID="onboarding-finish" onPress={() => void finish()} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Finish setup</Text>
              )}
            </Pressable>
          </GlassCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  body: { color: colors.textSecondary, fontSize: 15, lineHeight: 22 },
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginBottom: 12,
  },
  list: { gap: 4, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  cardName: { color: colors.text, fontSize: 15 },
  add: { color: colors.accent, fontWeight: '600' },
  meta: { color: colors.textTertiary, fontSize: 13, marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
