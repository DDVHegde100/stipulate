import type { Config } from 'tailwindcss';
import stipulatePreset from '@stipulate/brand/tailwind';
import stipulateUiPreset from '@stipulate/ui/tailwind';

const config: Config = {
  presets: [stipulatePreset, stipulateUiPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
};

export default config;
