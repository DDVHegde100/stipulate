import type { Config } from 'tailwindcss';
import stipulatePreset from '@stipulate/brand/tailwind';

/**
 * Tailwind config for @stipulate/ui consumers.
 * Merge into your app config: presets: [stipulateUiPreset]
 */
const stipulateUiPreset: Partial<Config> = {
  presets: [stipulatePreset],
  content: [
    './node_modules/@stipulate/ui/dist/**/*.{js,mjs}',
    './node_modules/@stipulate/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};

export default stipulateUiPreset;
