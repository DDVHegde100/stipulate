import { colors as brandColors } from '@stipulate/brand';

/** Mobile theme colors derived from @stipulate/brand tokens */
export const colors = {
  ink: brandColors.ink.DEFAULT,
  inkMuted: brandColors.ink[700],
  accent: brandColors.accent.DEFAULT,
  accentLight: brandColors.accent[300],
  accentDark: brandColors.accent[600],

  background: brandColors.background.primary,
  backgroundSecondary: brandColors.background.secondary,
  backgroundElevated: brandColors.background.elevated,

  text: brandColors.text.primary,
  textSecondary: brandColors.text.secondary,
  textTertiary: brandColors.text.tertiary,
  textAccent: brandColors.text.accent,

  glass: brandColors.glass,
  semantic: brandColors.semantic,

  tabBar: {
    background: 'rgba(10, 10, 11, 0.92)',
    border: brandColors.glass.border,
    active: brandColors.accent.DEFAULT,
    inactive: brandColors.text.tertiary,
  },
} as const;

export type ThemeColors = typeof colors;
