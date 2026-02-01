/**
 * Stipulate typography scale
 * Primary: Geist Sans (with Inter fallback)
 * Mono: Geist Mono
 */

export const fontFamily = {
  sans: [
    'Geist',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'Geist Mono',
    'SF Mono',
    'Monaco',
    'Inconsolata',
    'Fira Code',
    'Consolas',
    'monospace',
  ].join(', '),
  display: [
    'Geist',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'sans-serif',
  ].join(', '),
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const fontSize = {
  '2xs': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.02em' }],
  xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
  sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
  base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
  lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
  xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em' }],
  '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
  '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.035em' }],
  '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
  '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.045em' }],
  '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.05em' }],
} as const;

/** Semantic typography presets for marketing + product UI */
export const textStyles = {
  displayHero: {
    fontFamily: fontFamily.display,
    fontSize: '4.5rem',
    lineHeight: '1',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.045em',
  },
  displayLarge: {
    fontFamily: fontFamily.display,
    fontSize: '3.75rem',
    lineHeight: '1.05',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.04em',
  },
  displayMedium: {
    fontFamily: fontFamily.display,
    fontSize: '3rem',
    lineHeight: '1.1',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.035em',
  },
  heading1: {
    fontFamily: fontFamily.sans,
    fontSize: '2.25rem',
    lineHeight: '2.5rem',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.03em',
  },
  heading2: {
    fontFamily: fontFamily.sans,
    fontSize: '1.875rem',
    lineHeight: '2.25rem',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.025em',
  },
  heading3: {
    fontFamily: fontFamily.sans,
    fontSize: '1.5rem',
    lineHeight: '2rem',
    fontWeight: fontWeight.semibold,
    letterSpacing: '-0.02em',
  },
  heading4: {
    fontFamily: fontFamily.sans,
    fontSize: '1.25rem',
    lineHeight: '1.875rem',
    fontWeight: fontWeight.medium,
    letterSpacing: '-0.02em',
  },
  bodyLarge: {
    fontFamily: fontFamily.sans,
    fontSize: '1.125rem',
    lineHeight: '1.75rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '-0.01em',
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: '1rem',
    lineHeight: '1.5rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '-0.01em',
  },
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '0.01em',
  },
  overline: {
    fontFamily: fontFamily.sans,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    fontWeight: fontWeight.medium,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },
  codeBlock: {
    fontFamily: fontFamily.mono,
    fontSize: '0.8125rem',
    lineHeight: '1.5rem',
    fontWeight: fontWeight.regular,
    letterSpacing: '0',
  },
} as const;

export type TextStyle = keyof typeof textStyles;
export type FontSize = keyof typeof fontSize;
