import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { fetchConsumerBillingStatus } from '@/lib/consumer-billing';
import { colors } from '@/theme/colors';

export function PremiumGate({ feature, children }: { feature: string; children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchConsumerBillingStatus()
      .then((status) => setIsPremium(status.isPremium))
      .catch(() => setIsPremium(false));
  }, []);

  if (isPremium === null) {
    return <Text style={styles.loading}>Checking subscription…</Text>;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <GlassCard>
      <Text style={styles.title}>Consumer Premium required</Text>
      <Text style={styles.body}>{feature} is included with Consumer Premium.</Text>
      <Pressable style={styles.button} onPress={() => router.push('/(tabs)/profile')}>
        <Text style={styles.buttonText}>Upgrade in Profile</Text>
      </Pressable>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.textSecondary, padding: 20 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  body: { color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
