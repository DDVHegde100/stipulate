import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { glass, glassStyles } from '@stipulate/brand';

import { colors } from '@/theme/colors';

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
};

export function GlassCard({ children, style, intensity = 40 }: GlassCardProps) {
  const content = (
    <View style={[styles.inner, style]}>
      {children}
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.card, styles.webCard, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.overlay} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.border,
    backgroundColor: glass.surface,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.24,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  webCard: {
    backdropFilter: glassStyles.card.backdropFilter,
    WebkitBackdropFilter: glassStyles.card.WebkitBackdropFilter,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.24)',
  } as ViewStyle,
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glass.highlight,
  },
  inner: {
    padding: 20,
  },
});
