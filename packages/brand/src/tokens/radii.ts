/**
 * Border radius tokens — soft, modern corners matching Agentcard aesthetic
 */

export const radii = {
  none: '0',
  sm: '6px',
  DEFAULT: '8px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '32px',
  full: '9999px',
} as const;

/** Component-specific radius presets */
export const componentRadii = {
  button: radii.lg,
  buttonSm: radii.md,
  buttonLg: radii.xl,
  input: radii.lg,
  card: radii['2xl'],
  cardSm: radii.xl,
  modal: radii['3xl'],
  badge: radii.full,
  avatar: radii.full,
  logo: radii.xl,
  tooltip: radii.md,
  code: radii.md,
} as const;

export type RadiusToken = keyof typeof radii;
