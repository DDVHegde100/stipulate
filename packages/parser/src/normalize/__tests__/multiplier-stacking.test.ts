import { describe, it, expect } from 'vitest';
import {
  detectPortalBonus,
  detectLimitedTimeOffer,
  extractMultiplierLayers,
  computeStackedMultiplier,
  applyMultiplierStacking,
} from '../multiplier-stacking.js';

describe('multiplier layer detection', () => {
  it('detects chase travel portal bonus', () => {
    const layer = detectPortalBonus(
      'Book hotels through the Chase Travel portal and earn 5x points.',
    );
    expect(layer).not.toBeNull();
    expect(layer!.type).toBe('portal');
    expect(layer!.multiplier).toBe(5);
  });

  it('detects limited-time offer multiplier', () => {
    const layer = detectLimitedTimeOffer(
      'Limited-time promotional offer: earn 3x points through March 31, 2026.',
    );
    expect(layer).not.toBeNull();
    expect(layer!.type).toBe('limited_time_offer');
  });

  it('extracts category and portal layers from text', () => {
    const layers = extractMultiplierLayers(
      'Earn 3x on dining. Book through the Chase Travel portal and earn 5x points.',
      'chase',
    );
    expect(layers.some((l) => l.type === 'category')).toBe(true);
    expect(layers.some((l) => l.type === 'portal')).toBe(true);
  });
});

describe('computeStackedMultiplier', () => {
  it('stacks category and portal additively for chase', () => {
    const layers = extractMultiplierLayers(
      'Earn 3x on travel. Book through the Chase Travel portal and earn 5x points.',
      'chase',
    );
    const result = computeStackedMultiplier(layers, 'chase');
    expect(result.effectiveMultiplier).toBeGreaterThan(3);
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  it('caps multiplier at issuer maximum', () => {
    const result = computeStackedMultiplier(
      [
        { type: 'category', multiplier: 8, label: 'Category', stacksWith: ['portal'] },
        { type: 'portal', multiplier: 10, label: 'Portal', stacksWith: ['category'] },
      ],
      'capital-one',
    );
    expect(result.effectiveMultiplier).toBeLessThanOrEqual(5);
  });
});

describe('applyMultiplierStacking', () => {
  it('updates benefit multipliers when portal stacks', () => {
    const { benefits, stackingNotes } = applyMultiplierStacking(
      [
        {
          name: 'Travel',
          description: 'Earn on travel',
          category: 'travel',
          multiplier: 3,
          rewardType: 'points',
          caps: [],
          exclusions: [],
          requiresActivation: false,
        },
      ],
      'chase',
      'Earn 3x on travel. Book through the Chase Travel portal and earn 5x points.',
    );
    expect(benefits[0]!.multiplier).toBeGreaterThan(3);
    expect(stackingNotes.length).toBeGreaterThan(0);
  });
});
