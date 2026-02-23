import { StyleSheet, Text, View } from 'react-native';
import type { RouteRecommendation } from '@stipulate/schema';
import { GlassCard } from '@/components/GlassCard';
import { colors } from '@/theme/colors';

export function RouteResult({ recommendation }: { recommendation: RouteRecommendation }) {
  return (
    <>
      <GlassCard>
        <Text style={styles.cardLabel}>Next purchase</Text>
        <Text style={styles.merchant}>{recommendation.merchant}</Text>
        <Text style={styles.amount}>
          {recommendation.currency} {recommendation.amount.toFixed(2)}
        </Text>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardLabel}>Recommendation</Text>
        {recommendation.recommendedCard ? (
          <>
            <Text style={styles.recommended}>{recommendation.recommendedCardLabel ?? recommendation.recommendedCard}</Text>
            <Text style={styles.reason}>{recommendation.reason}</Text>
            {recommendation.factors.slice(0, 3).map((factor) => (
              <Text key={factor.label} style={styles.factor}>
                {factor.label}: {String(factor.value)}
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.reason}>{recommendation.reason}</Text>
        )}
      </GlassCard>
    </>
  );
}

const styles = StyleSheet.create({
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
  },
  recommended: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  reason: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  factor: {
    color: colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
  },
});
