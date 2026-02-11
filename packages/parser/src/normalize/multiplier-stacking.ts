import type { BenefitRule } from '@stipulate/schema';
import type { RawParsedBenefit } from '../types.js';

/** Layer types ordered by application precedence (lowest priority first). */
export type MultiplierLayerType =
  | 'base'
  | 'category'
  | 'portal'
  | 'limited_time_offer'
  | 'anniversary'
  | 'activation_bonus';

export interface MultiplierLayer {
  type: MultiplierLayerType;
  multiplier: number;
  label: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  requiresActivation?: boolean;
  stacksWith: MultiplierLayerType[];
}

export interface StackedMultiplierResult {
  effectiveMultiplier: number;
  layers: MultiplierLayer[];
  reasoning: string[];
  cappedAt?: number;
}

/** Default stacking rules — category + portal typically stack additively on UR/MR programs. */
export const DEFAULT_STACKING_RULES: Record<
  string,
  { additive: MultiplierLayerType[]; maxMultiplier: number }
> = {
  chase: { additive: ['category', 'portal'], maxMultiplier: 10 },
  amex: { additive: ['category', 'limited_time_offer'], maxMultiplier: 8 },
  citi: { additive: ['category', 'portal'], maxMultiplier: 6 },
  'capital-one': { additive: ['category'], maxMultiplier: 5 },
  default: { additive: ['category', 'portal', 'limited_time_offer'], maxMultiplier: 5 },
};

/** Detect portal bonus mentions in benefit text. */
export function detectPortalBonus(text: string): MultiplierLayer | null {
  const match = text.match(
    /(?:through|via)\s+(?:the\s+)?(?:chase|amex|capital one|citi|issuer)\s+(?:travel\s+)?portal[^.]*?(\d+(?:\.\d+)?)\s*(?:x|times|points)/i,
  );
  if (!match) return null;

  return {
    type: 'portal',
    multiplier: parseFloat(match[1]!),
    label: 'Travel portal bonus',
    stacksWith: ['category'],
  };
}

/** Detect limited-time offer multipliers. */
export function detectLimitedTimeOffer(text: string): MultiplierLayer | null {
  const match = text.match(
    /(?:limited[- ]time|promotional|bonus)[^.]*?(\d+(?:\.\d+)?)\s*(?:x|times|points)/i,
  );
  if (!match) return null;

  const dateMatch = text.match(/(?:through|until|expires?)\s+(\w+\s+\d{1,2},?\s+\d{4})/i);

  return {
    type: 'limited_time_offer',
    multiplier: parseFloat(match[1]!),
    label: 'Limited-time offer',
    effectiveTo: dateMatch?.[1],
    stacksWith: ['category'],
  };
}

/** Detect anniversary or cardmember bonus layers. */
export function detectAnniversaryBonus(text: string): MultiplierLayer | null {
  if (!/anniversary|cardmember|member since/i.test(text)) return null;

  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:x|times|points|percent|%)/i);
  if (!match) return null;

  return {
    type: 'anniversary',
    multiplier: parseFloat(match[1]!),
    label: 'Anniversary bonus',
    stacksWith: ['category'],
  };
}

/** Extract all multiplier layers from unstructured benefit text. */
export function extractMultiplierLayers(text: string, _issuer: string): MultiplierLayer[] {
  const layers: MultiplierLayer[] = [];

  const baseMatch = text.match(/earn\s+(\d+(?:\.\d+)?)\s*(?:x|points?)\s+(?:on|for|at)/i);
  if (baseMatch) {
    layers.push({
      type: 'category',
      multiplier: parseFloat(baseMatch[1]!),
      label: 'Category earn rate',
      stacksWith: ['portal', 'limited_time_offer'],
    });
  }

  const portal = detectPortalBonus(text);
  if (portal) layers.push(portal);

  const lto = detectLimitedTimeOffer(text);
  if (lto) layers.push(lto);

  const anniversary = detectAnniversaryBonus(text);
  if (anniversary) layers.push(anniversary);

  if (layers.length === 0) {
    layers.push({ type: 'base', multiplier: 1, label: 'Base earn', stacksWith: [] });
  }

  return layers;
}

/** Compute effective stacked multiplier for routing decisions. */
export function computeStackedMultiplier(
  layers: MultiplierLayer[],
  issuer: string,
): StackedMultiplierResult {
  const rules = DEFAULT_STACKING_RULES[issuer.toLowerCase().replace(/\s+/g, '-')] ?? DEFAULT_STACKING_RULES.default!;
  const reasoning: string[] = [];

  let effective = 1;
  const applied: MultiplierLayer[] = [];

  const categoryLayer = layers.find((l) => l.type === 'category' || l.type === 'base');
  if (categoryLayer) {
    effective = categoryLayer.multiplier;
    applied.push(categoryLayer);
    reasoning.push(`Base category: ${categoryLayer.multiplier}x`);
  }

  for (const layerType of rules.additive) {
    const layer = layers.find((l) => l.type === layerType && l !== categoryLayer);
    if (!layer) continue;

    const canStack = categoryLayer?.stacksWith.includes(layerType) ?? true;
    if (!canStack) {
      reasoning.push(`Skipped ${layer.label}: does not stack`);
      continue;
    }

    effective += layer.multiplier - 1;
    applied.push(layer);
    reasoning.push(`+ ${layer.label}: effective ${effective}x`);
  }

  if (effective > rules.maxMultiplier) {
    reasoning.push(`Capped at issuer max ${rules.maxMultiplier}x`);
    effective = rules.maxMultiplier;
  }

  return {
    effectiveMultiplier: Math.round(effective * 1000) / 1000,
    layers: applied,
    reasoning,
    cappedAt: effective >= rules.maxMultiplier ? rules.maxMultiplier : undefined,
  };
}

/** Apply stacking analysis to raw parsed benefits. */
export function applyMultiplierStacking(
  benefits: RawParsedBenefit[],
  issuer: string,
  sourceText: string,
): { benefits: RawParsedBenefit[]; stackingNotes: string[] } {
  const extraLayers = extractMultiplierLayers(sourceText, issuer);
  const stackingNotes: string[] = [];

  const updated = benefits.map((benefit) => {
    const layers = [
      {
        type: 'category' as const,
        multiplier: benefit.multiplier,
        label: benefit.name,
        stacksWith: ['portal', 'limited_time_offer'] as MultiplierLayerType[],
      },
      ...extraLayers.filter((l) => l.type !== 'category'),
    ];

    const stacked = computeStackedMultiplier(layers, issuer);
    if (stacked.effectiveMultiplier !== benefit.multiplier) {
      stackingNotes.push(
        `"${benefit.name}": ${benefit.multiplier}x → ${stacked.effectiveMultiplier}x stacked (${stacked.reasoning.join('; ')})`,
      );
    }

    return {
      ...benefit,
      multiplier: stacked.effectiveMultiplier,
      description: [benefit.description, ...stacked.reasoning].filter(Boolean).join(' | '),
    };
  });

  return { benefits: updated, stackingNotes };
}

/** Convert benefit rules back to layers for re-analysis. */
export function benefitRulesToLayers(rules: BenefitRule[]): MultiplierLayer[] {
  return rules.map((rule) => ({
    type: 'category' as const,
    multiplier: rule.multiplier,
    label: rule.name,
    stacksWith: ['portal', 'limited_time_offer'],
    requiresActivation: rule.requiresActivation,
  }));
}
