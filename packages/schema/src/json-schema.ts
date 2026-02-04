import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import { BenefitRuleSchema, BenefitCapSchema, ExclusionSchema } from './benefit.js';
import { CardSchema, CardCatalogSchema } from './card.js';
import { RouteRequestSchema, RouteResponseSchema, RankedCardSchema } from './routing.js';
import { MerchantEnrichmentSchema } from './merchant.js';
import {
  ParsedBenefitSchema,
  ParsedBenefitBundleSchema,
  BenefitChangeSchema,
} from './parsed-benefit.js';

export const SCHEMA_REGISTRY = {
  BenefitRule: BenefitRuleSchema,
  BenefitCap: BenefitCapSchema,
  Exclusion: ExclusionSchema,
  Card: CardSchema,
  CardCatalog: CardCatalogSchema,
  RouteRequest: RouteRequestSchema,
  RouteResponse: RouteResponseSchema,
  RankedCard: RankedCardSchema,
  MerchantEnrichment: MerchantEnrichmentSchema,
  ParsedBenefit: ParsedBenefitSchema,
  ParsedBenefitBundle: ParsedBenefitBundleSchema,
  BenefitChange: BenefitChangeSchema,
} as const satisfies Record<string, ZodTypeAny>;

export type SchemaName = keyof typeof SCHEMA_REGISTRY;

const BASE_URI = 'https://stipulate.io/schemas/v1';

/** Convert a registered Zod schema to JSON Schema draft-07. */
export function toJsonSchema(name: SchemaName, schema: ZodTypeAny = SCHEMA_REGISTRY[name]) {
  return zodToJsonSchema(schema, {
    name,
    $refStrategy: 'none',
    target: 'jsonSchema7',
    definitionPath: 'definitions',
    basePath: [`${BASE_URI}/${name}`],
  });
}

/** Export all registered schemas as a single JSON Schema document with definitions. */
export function exportAllJsonSchemas(): {
  $schema: string;
  $id: string;
  title: string;
  definitions: Record<string, ReturnType<typeof toJsonSchema>>;
} {
  const definitions: Record<string, ReturnType<typeof toJsonSchema>> = {};

  for (const name of Object.keys(SCHEMA_REGISTRY) as SchemaName[]) {
    definitions[name] = toJsonSchema(name);
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `${BASE_URI}/index.json`,
    title: 'Stipulate API Schemas',
    definitions,
  };
}

/** Validate unknown JSON against a named schema using Zod (runtime). */
export function validateAgainstSchema<T extends SchemaName>(
  name: T,
  input: unknown,
): { success: true; data: unknown } | { success: false; errors: string[] } {
  const schema = SCHEMA_REGISTRY[name];
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
