export {
  CurrencyCodeSchema,
  MoneySchema,
  SpendingCategorySchema,
  CardNetworkSchema,
  BenefitPeriodSchema,
  ExclusionTypeSchema,
  PurchaseChannelSchema,
  DateRangeSchema,
  MetadataSchema,
  moneyFromDecimal,
  moneyToDecimal,
  safeParse,
  type CurrencyCode,
  type Money,
  type SpendingCategory,
  type CardNetwork,
  type BenefitPeriod,
  type ExclusionType,
  type PurchaseChannel,
  type DateRange,
  type Metadata,
} from "./common.js";

export {
  BenefitCapSchema,
  ExclusionSchema,
  BenefitRuleSchema,
  matchesExclusion,
  computeCappedReward,
  type BenefitCap,
  type Exclusion,
  type BenefitRule,
} from "./benefit.js";

export {
  CardSchema,
  CardCatalogSchema,
  findCardById,
  resolveBenefitRules,
  filterCardsByIds,
  type Card,
  type CardCatalog,
} from "./card.js";

export {
  MerchantEnrichmentSchema,
  MerchantEnrichmentSourceSchema,
  MerchantContextSchema,
  normalizeMerchantName,
  mergeEnrichments,
  categoryFromMccDescription,
  type MerchantEnrichment,
  type MerchantEnrichmentSource,
  type MerchantContext,
} from "./merchant.js";

export {
  RouteRequestSchema,
  RankedCardSchema,
  RouteResponseSchema,
  sortRankedCards,
  getBestCard,
  validateRouteResponseConsistency,
  type RouteRequest,
  type RankedCard,
  type RouteResponse,
} from "./routing.js";

export {
  ParsedBenefitSchema,
  ParsedBenefitBundleSchema,
  BenefitChangeSchema,
  parsedBenefitToRuleFields,
  computeBundleConfidence,
  diffBenefitBundles,
  type ParsedBenefit,
  type ParsedBenefitBundle,
  type BenefitChange,
} from "./parsed-benefit.js";

export {
  SCHEMA_REGISTRY,
  toJsonSchema,
  exportAllJsonSchemas,
  validateAgainstSchema,
  type SchemaName,
} from "./json-schema.js";
export {
  seedEntryToCard,
  buildCatalog,
  expandCatalogEntries,
  ISSUER_SLUG_MAP,
  PRODUCT_TIER_SUFFIXES,
  COBRAND_PARTNERS,
  type CardSeedEntry,
} from "./catalog-seed.js";
