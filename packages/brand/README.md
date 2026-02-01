# @stipulate/brand

Stipulate design system — logos, tokens, CSS variables, and Tailwind preset.

## Assets

| File | Description |
|------|-------------|
| `logo-icon.svg` | App icon with stylized § stipulation mark |
| `logo-wordmark.svg` | Text-only wordmark |
| `logo-full.svg` | Icon + wordmark horizontal lockup |
| `logo-icon-light.svg` | Light background variant |
| `favicon.svg` | 32×32 favicon |

## Colors

- **Ink**: `#0A0A0B` — primary background
- **Accent**: `#6366F1` — indigo action color
- **Glass**: `rgba(255, 255, 255, 0.06)` — card surfaces

## Usage

```ts
import { tokens, brand, colorsToCssVars } from '@stipulate/brand';
```

```css
@import '@stipulate/brand/css/fonts.css';
@import '@stipulate/brand/css/variables.css';
```

```ts
// tailwind.config.ts
import stipulatePreset from '@stipulate/brand/tailwind';

export default {
  presets: [stipulatePreset],
};
```
