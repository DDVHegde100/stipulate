export { colors, colorsToCssVars, type ColorToken, type InkShade, type AccentShade } from './tokens/colors.js';
export {
  fontFamily,
  fontWeight,
  fontSize,
  textStyles,
  type TextStyle,
  type FontSize,
} from './tokens/typography.js';
export { spacing, layout, container, type SpacingToken, type LayoutToken } from './tokens/spacing.js';
export { radii, componentRadii, type RadiusToken } from './tokens/radii.js';
export { shadows, glassShadow, type ShadowToken } from './tokens/shadows.js';
export { glass, glassStyles, type GlassToken } from './tokens/glass.js';
export {
  duration,
  easing,
  transitions,
  keyframes,
  animations,
  type DurationToken,
  type EasingToken,
} from './tokens/motion.js';
export { breakpoints, media, zIndex, type BreakpointToken, type ZIndexToken } from './tokens/breakpoints.js';

import { colors } from './tokens/colors.js';
import { fontFamily, fontSize, fontWeight } from './tokens/typography.js';
import { spacing, layout, container } from './tokens/spacing.js';
import { radii, componentRadii } from './tokens/radii.js';
import { shadows, glassShadow } from './tokens/shadows.js';
import { glass } from './tokens/glass.js';
import { duration, easing, transitions, animations } from './tokens/motion.js';
import { breakpoints, zIndex } from './tokens/breakpoints.js';

/** Unified design token object for programmatic access */
export const tokens = {
  colors,
  fontFamily,
  fontWeight,
  fontSize,
  spacing,
  layout,
  container,
  radii,
  componentRadii,
  shadows,
  glassShadow,
  glass,
  duration,
  easing,
  transitions,
  animations,
  breakpoints,
  zIndex,
} as const;

export type DesignTokens = typeof tokens;

/** Brand metadata */
export const brand = {
  name: 'Stipulate',
  tagline: 'Parse the stipulations. Route the payment.',
  description: 'Card benefit intelligence API — parse fine print, route spend to max return.',
  domain: 'stipulate.io',
  github: 'https://github.com/ddvhegde100/stipulate',
  colors: {
    ink: '#0A0A0B',
    accent: '#6366F1',
    glass: 'rgba(255, 255, 255, 0.06)',
  },
} as const;
