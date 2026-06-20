-- 017_rotating_categories_and_card_programs.sql
-- Dynamic category state and future card issuing metadata

CREATE TABLE IF NOT EXISTS rotating_category_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID REFERENCES consumer_users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_ref VARCHAR(128) NOT NULL DEFAULT 'default',
  card_id VARCHAR(128) NOT NULL,
  state_type VARCHAR(32) NOT NULL
    CHECK (state_type IN ('custom_cash_top', 'discover_quarter', 'chase_quarter', 'manual')),
  active_category VARCHAR(64),
  quarter_key VARCHAR(16),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  activated BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotating_category_lookup
  ON rotating_category_state(card_id, user_ref, effective_from DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rotating_category_active
  ON rotating_category_state(
    COALESCE(consumer_user_id::text, org_id::text, user_ref),
    card_id,
    state_type,
    quarter_key
  )
  WHERE effective_to IS NULL;

CREATE TABLE IF NOT EXISTS card_programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  processor VARCHAR(32) NOT NULL DEFAULT 'sandbox'
    CHECK (processor IN ('sandbox', 'lithic', 'marqeta', 'stripe_issuing')),
  status VARCHAR(32) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sandbox', 'production', 'suspended')),
  bin_prefix VARCHAR(8),
  network VARCHAR(32) NOT NULL DEFAULT 'visa'
    CHECK (network IN ('visa', 'mastercard', 'amex', 'discover')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO card_programs (slug, name, processor, status, metadata)
VALUES (
  'stipulate_sandbox',
  'Stipulate Sandbox Program',
  'sandbox',
  'sandbox',
  '{"description": "Placeholder program for future virtual card issuance"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
