-- 015_user_wallet_and_cap_spend.sql
-- Server-side consumer wallet and cap spend audit ledger

CREATE TABLE IF NOT EXISTS user_wallet_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID NOT NULL REFERENCES consumer_users(id) ON DELETE CASCADE,
  card_id VARCHAR(128) NOT NULL,
  label VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMPTZ,
  UNIQUE (consumer_user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wallet_cards_user
  ON user_wallet_cards(consumer_user_id)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_wallet_cards_card
  ON user_wallet_cards(card_id)
  WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS cap_spend_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  user_ref VARCHAR(128) NOT NULL DEFAULT 'default',
  card_id VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  cap_period VARCHAR(32) NOT NULL DEFAULT 'annual',
  period_start DATE NOT NULL,
  delta_cents INTEGER NOT NULL,
  source VARCHAR(64) NOT NULL DEFAULT 'route',
  routing_request_id UUID REFERENCES routing_requests(id),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cap_spend_ledger_lookup
  ON cap_spend_ledger(org_id, user_ref, card_id, category, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_cap_spend_ledger_created
  ON cap_spend_ledger(created_at DESC);

-- Track published benefit version metadata alongside snapshots
ALTER TABLE benefit_versions
  ADD COLUMN IF NOT EXISTS published_by VARCHAR(128);

ALTER TABLE benefit_versions
  ADD COLUMN IF NOT EXISTS rule_count INTEGER;
