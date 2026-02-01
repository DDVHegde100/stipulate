/**
 * Glass morphism tokens — core Agentcard-style surface system
 */

export const glass = {
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.09)',
  surfaceActive: 'rgba(255, 255, 255, 0.12)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  highlight: 'rgba(255, 255, 255, 0.04)',
  backdrop: 'rgba(10, 10, 11, 0.72)',
  blur: '12px',
  blurLg: '24px',
  blurXl: '40px',
  saturate: '180%',
} as const;

/** Pre-composed glass surface styles for CSS-in-JS consumers */
export const glassStyles = {
  card: {
    background: glass.surface,
    backdropFilter: `blur(${glass.blur}) saturate(${glass.saturate})`,
    WebkitBackdropFilter: `blur(${glass.blur}) saturate(${glass.saturate})`,
    border: `1px solid ${glass.border}`,
    boxShadow: `
      inset 0 1px 0 ${glass.highlight},
      0 4px 24px rgba(0, 0, 0, 0.24)
    `,
  },
  cardHover: {
    background: glass.surfaceHover,
    borderColor: glass.borderStrong,
  },
  nav: {
    background: 'rgba(10, 10, 11, 0.8)',
    backdropFilter: `blur(${glass.blurLg}) saturate(${glass.saturate})`,
    WebkitBackdropFilter: `blur(${glass.blurLg}) saturate(${glass.saturate})`,
    borderBottom: `1px solid ${glass.border}`,
  },
  modal: {
    background: 'rgba(17, 17, 19, 0.92)',
    backdropFilter: `blur(${glass.blurXl}) saturate(${glass.saturate})`,
    WebkitBackdropFilter: `blur(${glass.blurXl}) saturate(${glass.saturate})`,
    border: `1px solid ${glass.borderStrong}`,
  },
  overlay: {
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: `blur(4px)`,
    WebkitBackdropFilter: `blur(4px)`,
  },
} as const;

export type GlassToken = keyof typeof glass;
