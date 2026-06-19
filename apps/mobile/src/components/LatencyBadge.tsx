import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface LatencyBadgeProps {
  ms: number;
}

export function LatencyBadge({ ms }: LatencyBadgeProps) {
  const fast = ms < 300;
  return (
    <View style={[styles.badge, fast ? styles.fast : styles.slow]}>
      <Text style={styles.text}>{ms}ms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  fast: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  slow: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
