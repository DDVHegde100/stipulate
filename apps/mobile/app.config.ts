import type { ExpoConfig, ConfigContext } from 'expo/config';

/** Mirrors @stipulate/brand metadata — kept inline so config resolves without a build step */
const brand = {
  name: 'Stipulate',
  tagline: 'Parse the stipulations. Route the payment.',
  domain: 'stipulate.io',
  colors: {
    ink: '#0A0A0B',
    accent: '#6366F1',
  },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: brand.name,
  slug: 'stipulate',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'stipulate',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  icon: '../../packages/brand/assets/logo-icon.svg',
  splash: {
    backgroundColor: brand.colors.ink,
    resizeMode: 'contain',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.stipulate.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: '../../packages/brand/assets/logo-icon.svg',
      backgroundColor: brand.colors.ink,
    },
    package: 'io.stipulate.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: '../../packages/brand/assets/favicon.svg',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    tagline: brand.tagline,
    domain: brand.domain,
    eas: {
      projectId: 'stipulate-mobile',
    },
  },
});
