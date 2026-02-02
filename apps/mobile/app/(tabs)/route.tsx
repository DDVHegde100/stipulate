import type { RouteRecommendation } from '@stipulate/schema';
import { brand } from '@stipulate/brand';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { colors } from '@/theme/colors';

/** Stub recommendation shown until routing API is wired */
const stubRecommendation: RouteRecommendation = {
  merchant: 'Example Merchant',
  amount: 42.5,
  currency: 'USD',
  recommendedCard: null,
  reason: 'Link a card to get routing recommendations.',
  confidence: 0,
};

export default function RouteScreen() {
  const { merchant, amount, currency, reason } = stubRecommendation;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Payment routing</Text>
        <Text style={styles.title}>Route the payment</Text>
        <Text style={styles.subtitle}>{brand.tagline}</Text>

        <GlassCard>
          <Text style={styles.cardLabel}>Next purchase</Text>
          <Text style={styles.merchant}>{merchant}</Text>
          <Text style={styles.amount}>
            {currency} {amount.toFixed(2)}
          </Text>
        </GlassCard>

        <GlassCard>
          <Text style={styles.cardLabel}>Recommendation</Text>
          <Text style={styles.recommendation}>{reason}</Text>
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardLabel: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  merchant: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  amount: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  recommendation: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
