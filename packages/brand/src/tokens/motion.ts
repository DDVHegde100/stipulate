/**
 * Motion and animation tokens
 */

export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '600ms',
} as const;

export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

export const transitions = {
  default: `all ${duration.normal} ${easing.easeInOut}`,
  fast: `all ${duration.fast} ${easing.easeOut}`,
  slow: `all ${duration.slow} ${easing.smooth}`,
  colors: `color ${duration.normal} ${easing.easeInOut}, background-color ${duration.normal} ${easing.easeInOut}, border-color ${duration.normal} ${easing.easeInOut}`,
  transform: `transform ${duration.normal} ${easing.spring}`,
  opacity: `opacity ${duration.normal} ${easing.easeInOut}`,
  shadow: `box-shadow ${duration.slow} ${easing.smooth}`,
} as const;

/** Keyframe animation definitions for CSS export */
export const keyframes = {
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeInUp: {
    from: { opacity: '0', transform: 'translateY(16px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  fadeInDown: {
    from: { opacity: '0', transform: 'translateY(-16px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  shimmer: {
    from: { backgroundPosition: '-200% 0' },
    to: { backgroundPosition: '200% 0' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.6' },
  },
  float: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-8px)' },
  },
  glow: {
    '0%, 100%': { boxShadow: '0 0 24px rgba(99, 102, 241, 0.24)' },
    '50%': { boxShadow: '0 0 32px rgba(99, 102, 241, 0.48)' },
  },
} as const;

export const animations = {
  fadeIn: `fadeIn ${duration.slow} ${easing.easeOut} forwards`,
  fadeInUp: `fadeInUp ${duration.slower} ${easing.emphasized} forwards`,
  fadeInDown: `fadeInDown ${duration.slower} ${easing.emphasized} forwards`,
  scaleIn: `scaleIn ${duration.slow} ${easing.spring} forwards`,
  shimmer: `shimmer 2s ${easing.linear} infinite`,
  pulse: `pulse 2s ${easing.easeInOut} infinite`,
  float: `float 4s ${easing.easeInOut} infinite`,
  glow: `glow 3s ${easing.easeInOut} infinite`,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
