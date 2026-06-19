import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';

interface MccChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function MccChip({ label, active, onPress }: MccChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glass.border,
    backgroundColor: colors.backgroundElevated,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  text: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  textActive: {
    color: colors.accentLight,
  },
});
