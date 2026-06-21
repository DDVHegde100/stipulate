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
  owner: 'stipulate',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'stipulate',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  runtimeVersion: {
    policy: 'appVersion',
  },
  icon: '../../packages/brand/assets/logo-icon.svg',
  splash: {
    backgroundColor: brand.colors.ink,
    resizeMode: 'contain',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'io.stipulate.app',
    associatedDomains: ['applinks:stipulate.io', 'applinks:www.stipulate.io'],
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSUserNotificationsUsageDescription:
        'Stipulate sends alerts when card benefits on your wallet change.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: '../../packages/brand/assets/logo-icon.svg',
      backgroundColor: brand.colors.ink,
    },
    package: 'io.stipulate.app',
    permissions: ['POST_NOTIFICATIONS'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'stipulate.io', pathPrefix: '/app' },
          { scheme: 'https', host: 'www.stipulate.io', pathPrefix: '/app' },
          { scheme: 'stipulate' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: '../../packages/brand/assets/favicon.svg',
  },
  plugins: [
    'expo-router',
    [
      'expo-notifications',
      {
        icon: '../../packages/brand/assets/logo-icon.svg',
        color: brand.colors.accent,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    tagline: brand.tagline,
    domain: brand.domain,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/v1',
    apiKey: process.env.EXPO_PUBLIC_API_KEY ?? 'stip_dev_local_key_change_in_production',
    eas: {
      projectId: 'stipulate-mobile',
    },
    router: {
      origin: `https://${brand.domain}`,
    },
  },
});
