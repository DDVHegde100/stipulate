-- 024_issuing_authorizations.sql
-- Ledger for Stripe Issuing authorization webhooks

CREATE TABLE IF NOT EXISTS issuing_authorizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  virtual_card_id UUID REFERENCES virtual_cards(id) ON DELETE SET NULL,
  card_external_id VARCHAR(128) NOT NULL,
  external_id VARCHAR(128) NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  merchant_name VARCHAR(255),
  merchant_category_code VARCHAR(4),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'reversed')),
  authorized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issuing_auth_card ON issuing_authorizations(virtual_card_id);
CREATE INDEX IF NOT EXISTS idx_issuing_auth_card_external ON issuing_authorizations(card_external_id);
