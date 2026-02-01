/**
 * Shadow and elevation tokens
 */

export const shadows = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.24)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.24), 0 1px 2px rgba(0, 0, 0, 0.16)',
  DEFAULT: '0 4px 8px rgba(0, 0, 0, 0.24), 0 2px 4px rgba(0, 0, 0, 0.16)',
  md: '0 8px 16px rgba(0, 0, 0, 0.28), 0 4px 8px rgba(0, 0, 0, 0.16)',
  lg: '0 16px 32px rgba(0, 0, 0, 0.32), 0 8px 16px rgba(0, 0, 0, 0.16)',
  xl: '0 24px 48px rgba(0, 0, 0, 0.36), 0 12px 24px rgba(0, 0, 0, 0.16)',
  '2xl': '0 32px 64px rgba(0, 0, 0, 0.4), 0 16px 32px rgba(0, 0, 0, 0.2)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.24)',
  accent: '0 8px 32px rgba(99, 102, 241, 0.24), 0 4px 16px rgba(99, 102, 241, 0.12)',
  accentLg: '0 16px 48px rgba(99, 102, 241, 0.32), 0 8px 24px rgba(99, 102, 241, 0.16)',
  glow: '0 0 24px rgba(99, 102, 241, 0.4)',
  glowSm: '0 0 12px rgba(99, 102, 241, 0.32)',
} as const;

/** Glass card shadow stack */
export const glassShadow = {
  card: `
    0 0 0 1px rgba(255, 255, 255, 0.08),
    0 4px 24px rgba(0, 0, 0, 0.24),
    0 1px 2px rgba(0, 0, 0, 0.16)
  `,
  cardHover: `
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 8px 32px rgba(0, 0, 0, 0.32),
    0 2px 4px rgba(0, 0, 0, 0.16)
  `,
  cardElevated: `
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 16px 48px rgba(0, 0, 0, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.2)
  `,
  inset: `
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.12)
  `,
} as const;

export type ShadowToken = keyof typeof shadows;
