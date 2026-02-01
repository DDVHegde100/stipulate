/**
 * Stipulate color tokens
 * Primary palette: ink (#0A0A0B) + indigo accent (#6366F1) + glass surfaces
 */

export const colors = {
  ink: {
    DEFAULT: '#0A0A0B',
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#0A0A0B',
  },

  accent: {
    DEFAULT: '#6366F1',
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    950: '#1E1B4B',
  },

  glass: {
    surface: 'rgba(255, 255, 255, 0.06)',
    surfaceHover: 'rgba(255, 255, 255, 0.09)',
    surfaceActive: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.14)',
    highlight: 'rgba(255, 255, 255, 0.04)',
    backdrop: 'rgba(10, 10, 11, 0.72)',
  },

  glassLight: {
    surface: 'rgba(255, 255, 255, 0.72)',
    surfaceHover: 'rgba(255, 255, 255, 0.85)',
    surfaceActive: 'rgba(255, 255, 255, 0.95)',
    border: 'rgba(10, 10, 11, 0.06)',
    borderStrong: 'rgba(10, 10, 11, 0.12)',
    highlight: 'rgba(255, 255, 255, 0.5)',
    backdrop: 'rgba(250, 250, 250, 0.8)',
  },

  semantic: {
    success: '#22C55E',
    successMuted: 'rgba(34, 197, 94, 0.12)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.12)',
    error: '#EF4444',
    errorMuted: 'rgba(239, 68, 68, 0.12)',
    info: '#3B82F6',
    infoMuted: 'rgba(59, 130, 246, 0.12)',
  },

  text: {
    primary: '#FAFAFA',
    secondary: 'rgba(250, 250, 250, 0.72)',
    tertiary: 'rgba(250, 250, 250, 0.48)',
    disabled: 'rgba(250, 250, 250, 0.32)',
    inverse: '#0A0A0B',
    inverseSecondary: 'rgba(10, 10, 11, 0.64)',
    accent: '#A5B4FC',
  },

  background: {
    primary: '#0A0A0B',
    secondary: '#111113',
    tertiary: '#18181B',
    elevated: '#1C1C1F',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },

  gradient: {
    hero: 'linear-gradient(180deg, #0A0A0B 0%, #111113 50%, #0A0A0B 100%)',
    accent: 'linear-gradient(135deg, #818CF8 0%, #6366F1 50%, #4F46E5 100%)',
    accentSubtle: 'linear-gradient(135deg, rgba(99, 102, 241, 0.24) 0%, rgba(99, 102, 241, 0.08) 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
    mesh: `
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.18), transparent),
      radial-gradient(ellipse 60% 40% at 80% 60%, rgba(129, 140, 248, 0.08), transparent),
      #0A0A0B
    `,
  },
} as const;

export type ColorToken = typeof colors;
export type InkShade = keyof typeof colors.ink;
export type AccentShade = keyof typeof colors.accent;

/** Flat CSS custom property map for runtime theming */
export function colorsToCssVars(mode: 'dark' | 'light' = 'dark'): Record<string, string> {
  const isDark = mode === 'dark';
  const glass = isDark ? colors.glass : colors.glassLight;
  const text = isDark
    ? colors.text
    : {
        primary: colors.ink.DEFAULT,
        secondary: 'rgba(10, 10, 11, 0.72)',
        tertiary: 'rgba(10, 10, 11, 0.48)',
        disabled: 'rgba(10, 10, 11, 0.32)',
        inverse: colors.text.primary,
        inverseSecondary: colors.text.secondary,
        accent: colors.accent[600],
      };

  return {
    '--color-ink': colors.ink.DEFAULT,
    '--color-accent': colors.accent.DEFAULT,
    '--color-accent-hover': colors.accent[400],
    '--color-accent-active': colors.accent[600],
    '--color-glass-surface': glass.surface,
    '--color-glass-surface-hover': glass.surfaceHover,
    '--color-glass-surface-active': glass.surfaceActive,
    '--color-glass-border': glass.border,
    '--color-glass-border-strong': glass.borderStrong,
    '--color-text-primary': text.primary,
    '--color-text-secondary': text.secondary,
    '--color-text-tertiary': text.tertiary,
    '--color-text-accent': text.accent,
    '--color-bg-primary': isDark ? colors.background.primary : colors.ink[50],
    '--color-bg-secondary': isDark ? colors.background.secondary : colors.ink[100],
    '--color-bg-elevated': isDark ? colors.background.elevated : '#FFFFFF',
    '--gradient-hero': colors.gradient.hero,
    '--gradient-accent': colors.gradient.accent,
    '--gradient-mesh': colors.gradient.mesh,
  };
}
