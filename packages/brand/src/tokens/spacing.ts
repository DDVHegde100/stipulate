/**
 * Stipulate spacing grid — 4px base unit
 * Scale follows a modified geometric progression for visual rhythm
 */

const BASE = 4;

export const spacing = {
  0: '0',
  px: '1px',
  0.5: `${BASE * 0.5}px`,   // 2px
  1: `${BASE}px`,             // 4px
  1.5: `${BASE * 1.5}px`,     // 6px
  2: `${BASE * 2}px`,         // 8px
  2.5: `${BASE * 2.5}px`,     // 10px
  3: `${BASE * 3}px`,         // 12px
  3.5: `${BASE * 3.5}px`,     // 14px
  4: `${BASE * 4}px`,         // 16px
  5: `${BASE * 5}px`,         // 20px
  6: `${BASE * 6}px`,         // 24px
  7: `${BASE * 7}px`,         // 28px
  8: `${BASE * 8}px`,         // 32px
  9: `${BASE * 9}px`,         // 36px
  10: `${BASE * 10}px`,       // 40px
  11: `${BASE * 11}px`,       // 44px
  12: `${BASE * 12}px`,       // 48px
  14: `${BASE * 14}px`,       // 56px
  16: `${BASE * 16}px`,       // 64px
  18: `${BASE * 18}px`,       // 72px
  20: `${BASE * 20}px`,       // 80px
  24: `${BASE * 24}px`,       // 96px
  28: `${BASE * 28}px`,       // 112px
  32: `${BASE * 32}px`,       // 128px
  36: `${BASE * 36}px`,       // 144px
  40: `${BASE * 40}px`,       // 160px
  44: `${BASE * 44}px`,       // 176px
  48: `${BASE * 48}px`,       // 192px
  52: `${BASE * 52}px`,       // 208px
  56: `${BASE * 56}px`,       // 224px
  60: `${BASE * 60}px`,       // 240px
  64: `${BASE * 64}px`,       // 256px
  72: `${BASE * 72}px`,       // 288px
  80: `${BASE * 80}px`,       // 320px
  96: `${BASE * 96}px`,       // 384px
} as const;

/** Semantic spacing for layout composition */
export const layout = {
  pagePaddingX: spacing[6],
  pagePaddingXMd: spacing[8],
  pagePaddingXLg: spacing[12],
  pagePaddingY: spacing[16],
  sectionGap: spacing[24],
  sectionGapLg: spacing[32],
  cardPadding: spacing[6],
  cardPaddingLg: spacing[8],
  stackGap: spacing[4],
  stackGapLg: spacing[6],
  inlineGap: spacing[2],
  inlineGapMd: spacing[3],
  navHeight: spacing[16],
  sidebarWidth: '280px',
  contentMaxWidth: '1200px',
  heroMaxWidth: '960px',
  proseMaxWidth: '680px',
} as const;

/** Container max-width breakpoints */
export const container = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
} as const;

export type SpacingToken = keyof typeof spacing;
export type LayoutToken = keyof typeof layout;
