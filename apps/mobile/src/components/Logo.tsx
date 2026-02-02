import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

type LogoProps = {
  size?: number;
  variant?: 'icon' | 'wordmark';
};

export function Logo({ size = 48, variant = 'icon' }: LogoProps) {
  if (variant === 'wordmark') {
    return (
      <Svg width={size * 5} height={size} viewBox="0 0 240 48" accessibilityLabel="Stipulate">
        <Defs>
          <LinearGradient id="wm-accent" x1="0" y1="0" x2="240" y2="48" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor={colors.textAccent} />
          </LinearGradient>
        </Defs>
        <Path
          d="M8 36 L8 8 L32 8 C42 8 48 13 48 20 C48 26 44 30 38 32 L48 36 L40 36 L32 33 L20 33 L20 36 Z M20 14 L20 27 L31 27 C36 27 39 24 39 20 C39 16 36 14 31 14 Z"
          fill="url(#wm-accent)"
        />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Stipulate icon">
      <Defs>
        <LinearGradient id="stipulate-accent" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor={colors.accentLight} />
          <Stop offset="100%" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      <Rect width="64" height="64" rx="16" fill={colors.ink} />
      <Rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="15"
        stroke={colors.glass.border}
        strokeWidth="1"
        fill="none"
      />
      <Path
        d="M32 14c-6.2 0-11 3.4-11 8.5 0 3.8 2.4 6.6 7.2 8.4l3.3 1.2c3.1 1.1 4.5 2.2 4.5 4.2 0 2.5-2.4 4.1-6.2 4.1-3.4 0-6.2-1.4-8-3.8l-4.8 4.2c2.8 3.6 7.4 5.6 12.8 5.6 7.2 0 12.4-3.8 12.4-9.5 0-4.4-2.8-7.4-8.4-9.4l-3.2-1.1c-3.4-1.2-4.8-2.3-4.8-4.4 0-2.3 2.1-3.8 5.4-3.8 2.8 0 5.2 1.1 6.8 3l4.6-3.8C42.2 15.6 37.6 14 32 14z"
        fill="url(#stipulate-accent)"
      />
      <Circle cx="32" cy="46" r="3.5" fill="url(#stipulate-accent)" opacity={0.9} />
    </Svg>
  );
}
