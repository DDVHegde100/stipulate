import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

interface CapProgressProps {
  label: string;
  spentMinor: number;
  capMinor: number;
  period?: string;
}

export function CapProgress({ label, spentMinor, capMinor, period = 'annual' }: CapProgressProps) {
  const ratio = capMinor > 0 ? Math.min(spentMinor / capMinor, 1) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>
          ${(spentMinor / 100).toFixed(0)} / ${(capMinor / 100).toFixed(0)} · {period}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.pct}>{pct}% used</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: colors.text, fontWeight: '600', fontSize: 14 },
  meta: { color: colors.textSecondary, fontSize: 12 },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 999,
  },
  pct: { color: colors.textSecondary, fontSize: 11 },
});
