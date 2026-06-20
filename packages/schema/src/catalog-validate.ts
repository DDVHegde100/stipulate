/**
 * Card catalog validation utilities for seed scripts and CI gates.
 */
import { readFileSync } from 'node:fs';
import { CardCatalogSchema, type CardCatalog } from './card.js';

export interface CatalogValidationIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  cardId?: string;
}

export interface CatalogValidationReport {
  valid: boolean;
  path?: string;
  cardCount: number;
  issuerCount: number;
  activeCount: number;
  withBenefitGuideCount: number;
  duplicateIds: string[];
  issues: CatalogValidationIssue[];
}

function collectStructuralIssues(catalog: CardCatalog): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const seenIds = new Map<string, number>();

  for (const card of catalog.cards) {
    seenIds.set(card.id, (seenIds.get(card.id) ?? 0) + 1);

    if (!card.productName.trim()) {
      issues.push({
        level: 'error',
        code: 'EMPTY_PRODUCT_NAME',
        message: 'Card productName must not be empty',
        cardId: card.id,
      });
    }

    if (card.annualFee && card.annualFee.amountMinor < 0) {
      issues.push({
        level: 'error',
        code: 'NEGATIVE_ANNUAL_FEE',
        message: 'annualFee.amountMinor must be >= 0',
        cardId: card.id,
      });
    }

    if (!card.benefitGuideUrl && card.isActive) {
      issues.push({
        level: 'warning',
        code: 'MISSING_BENEFIT_GUIDE',
        message: 'Active card has no benefitGuideUrl',
        cardId: card.id,
      });
    }
  }

  for (const [cardId, count] of seenIds) {
    if (count > 1) {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_CARD_ID',
        message: `Duplicate card id appears ${count} times`,
        cardId,
      });
    }
  }

  return issues;
}

/** Parse and validate raw catalog JSON. Throws on schema errors. */
export function parseCatalogJson(raw: unknown): CardCatalog {
  return CardCatalogSchema.parse(raw);
}

/** Validate catalog JSON and return a structured report. */
export function validateCatalog(raw: unknown, options: { path?: string } = {}): CatalogValidationReport {
  const catalog = parseCatalogJson(raw);
  const issues = collectStructuralIssues(catalog);
  const duplicateIds = issues
    .filter((i) => i.code === 'DUPLICATE_CARD_ID')
    .map((i) => i.cardId!)
    .filter(Boolean);

  const issuers = new Set(catalog.cards.map((c) => c.issuer));

  return {
    valid: issues.every((i) => i.level !== 'error'),
    path: options.path,
    cardCount: catalog.cards.length,
    issuerCount: issuers.size,
    activeCount: catalog.cards.filter((c) => c.isActive).length,
    withBenefitGuideCount: catalog.cards.filter((c) => Boolean(c.benefitGuideUrl)).length,
    duplicateIds,
    issues,
  };
}

/** Load and validate a catalog file from disk. */
export function validateCatalogFile(path: string): CatalogValidationReport {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  return validateCatalog(raw, { path });
}

/** Fail fast when catalog has blocking validation errors. */
export function assertValidCatalog(report: CatalogValidationReport): void {
  if (report.valid) return;

  const errors = report.issues.filter((i) => i.level === 'error');
  const summary = errors
    .slice(0, 10)
    .map((e) => `${e.cardId ?? 'catalog'}: ${e.message}`)
    .join('\n');

  throw new Error(
    `Catalog validation failed (${errors.length} error(s)${report.path ? ` in ${report.path}` : ''}):\n${summary}`,
  );
}
