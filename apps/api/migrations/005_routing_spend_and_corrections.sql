-- 005_routing_spend_and_corrections.sql
-- User category spend tracking for cap-aware routing + crowd MCC corrections

CREATE TABLE IF NOT EXISTS user_category_spend (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  user_ref VARCHAR(128) NOT NULL DEFAULT 'default',
  card_id VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  cap_period VARCHAR(32) NOT NULL DEFAULT 'annual',
  period_start DATE NOT NULL,
  spent_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_ref, card_id, category, cap_period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_user_category_spend_lookup
  ON user_category_spend(org_id, card_id, category, period_start DESC);

ALTER TABLE merchant_mcc_mappings
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE merchant_mcc_mappings
  ADD COLUMN IF NOT EXISTS submitted_by VARCHAR(128);

ALTER TABLE merchant_mcc_mappings
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE routing_requests
  ADD COLUMN IF NOT EXISTS best_card_id VARCHAR(128);

ALTER TABLE routing_requests
  ADD COLUMN IF NOT EXISTS merchant_name VARCHAR(512);

ALTER TABLE routing_requests
  ADD COLUMN IF NOT EXISTS category VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_merchant_mcc_status ON merchant_mcc_mappings(status);
