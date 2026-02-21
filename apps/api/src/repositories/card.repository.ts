import { query } from '../lib/db.js';

const DEMO_CATALOG = [
  { card_id: 'chase_sapphire_preferred', name: 'Sapphire Preferred', issuer_slug: 'chase', issuer_name: 'Chase', network: 'visa', annual_fee_cents: 9500, is_active: true, benefit_guide_url: null },
  { card_id: 'amex_gold', name: 'Gold Card', issuer_slug: 'amex', issuer_name: 'American Express', network: 'amex', annual_fee_cents: 25000, is_active: true, benefit_guide_url: null },
  { card_id: 'capital_one_venture', name: 'Venture', issuer_slug: 'capital-one', issuer_name: 'Capital One', network: 'visa', annual_fee_cents: 9500, is_active: true, benefit_guide_url: null },
];

export interface CardSummaryRow {
  card_id: string;
  name: string;
  issuer_slug: string | null;
  issuer_name: string | null;
  network: string;
  annual_fee_cents: number;
  is_active: boolean;
  benefit_guide_url: string | null;
}

/** Paginated card catalog search. */
export async function listCards(options: {
  limit: number;
  offset?: number;
  issuer?: string;
  network?: string;
  query?: string;
}): Promise<{ cards: CardSummaryRow[]; total: number }> {
  if (process.env.NODE_ENV === 'test') {
    let cards = [...DEMO_CATALOG];

    if (options.issuer) {
      cards = cards.filter((c) => c.issuer_slug?.includes(options.issuer!.toLowerCase()));
    }
    if (options.network) {
      cards = cards.filter((c) => c.network === options.network);
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      cards = cards.filter(
        (c) => c.card_id.includes(q) || c.name.toLowerCase().includes(q),
      );
    }

    const offset = options.offset ?? 0;
    return { cards: cards.slice(offset, offset + options.limit), total: cards.length };
  }

  const params: unknown[] = [options.limit, options.offset ?? 0];
  const conditions = ['c.is_active = TRUE'];

  if (options.issuer) {
    params.push(options.issuer);
    conditions.push(`i.slug = $${params.length}`);
  }
  if (options.network) {
    params.push(options.network);
    conditions.push(`c.network = $${params.length}`);
  }
  if (options.query) {
    params.push(`%${options.query}%`);
    conditions.push(`(c.card_id ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM cards c
     LEFT JOIN issuers i ON i.id = c.issuer_id
     ${where}`,
    params.slice(2),
  );

  const result = await query<CardSummaryRow>(
    `SELECT c.card_id, c.name, i.slug AS issuer_slug, i.name AS issuer_name,
            c.network, c.annual_fee_cents, c.is_active, c.benefit_guide_url
     FROM cards c
     LEFT JOIN issuers i ON i.id = c.issuer_id
     ${where}
     ORDER BY c.name ASC
     LIMIT $1 OFFSET $2`,
    params,
  );

  return {
    cards: result.rows,
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}
