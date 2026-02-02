import { brand } from '@stipulate/brand';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/GlassCard';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/colors';

export default function WalletScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Logo size={40} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{brand.name}</Text>
            <Text style={styles.subtitle}>{brand.tagline}</Text>
          </View>
        </View>

        <GlassCard>
          <Text style={styles.cardLabel}>Your cards</Text>
          <Text style={styles.cardTitle}>No cards linked yet</Text>
          <Text style={styles.cardBody}>
            Add a card to start parsing stipulations and maximizing return on every purchase.
          </Text>
        </GlassCard>

        <GlassCard style={styles.statCard}>
          <Text style={styles.statValue}>$0.00</Text>
          <Text style={styles.statLabel}>Potential rewards this month</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardLabel: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
  statLabel: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
  },
});
