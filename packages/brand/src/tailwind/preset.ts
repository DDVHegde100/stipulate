import type { Config } from 'tailwindcss';
import { colors } from '../tokens/colors.js';
import { fontFamily, fontSize } from '../tokens/typography.js';
import { spacing, container } from '../tokens/spacing.js';
import { radii } from '../tokens/radii.js';
import { shadows } from '../tokens/shadows.js';
import { breakpoints } from '../tokens/breakpoints.js';
import { duration, easing } from '../tokens/motion.js';

/**
 * Stipulate Tailwind CSS preset
 * Usage: presets: [require('@stipulate/brand/tailwind')]
 */
const stipulatePreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        ink: colors.ink,
        accent: colors.accent,
        glass: {
          surface: colors.glass.surface,
          hover: colors.glass.surfaceHover,
          border: colors.glass.border,
        },
        success: colors.semantic.success,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        info: colors.semantic.info,
      },
      fontFamily: {
        sans: fontFamily.sans.split(', '),
        mono: fontFamily.mono.split(', '),
        display: fontFamily.display.split(', '),
      },
      fontSize: Object.fromEntries(
        Object.entries(fontSize).map(([key, value]) => {
          const [size, opts] = value as [string, { lineHeight: string; letterSpacing: string }];
          return [key, [size, opts]];
        }),
      ),
      spacing,
      maxWidth: container,
      borderRadius: radii,
      boxShadow: {
        ...shadows,
        glass: `
          0 0 0 1px rgba(255, 255, 255, 0.08),
          0 4px 24px rgba(0, 0, 0, 0.24)
        `,
        'glass-hover': `
          0 0 0 1px rgba(255, 255, 255, 0.12),
          0 8px 32px rgba(0, 0, 0, 0.32)
        `,
      },
      screens: breakpoints,
      transitionDuration: duration,
      transitionTimingFunction: easing,
      backgroundImage: {
        'gradient-hero': colors.gradient.hero,
        'gradient-accent': colors.gradient.accent,
        'gradient-mesh': colors.gradient.mesh.replace(/\s+/g, ' ').trim(),
        'gradient-glass': colors.gradient.glass,
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out forwards',
        'fade-in-up': 'fadeInUp 400ms cubic-bezier(0.2, 0, 0, 1) forwards',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 3s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 24px rgba(99, 102, 241, 0.24)' },
          '50%': { boxShadow: '0 0 32px rgba(99, 102, 241, 0.48)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
};

export default stipulatePreset;
