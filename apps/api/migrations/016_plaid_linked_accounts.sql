-- 016_plaid_linked_accounts.sql
-- Bank link storage for Plaid integration (tokens encrypted at application layer)

CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID REFERENCES consumer_users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  item_id VARCHAR(128) NOT NULL UNIQUE,
  institution_id VARCHAR(64),
  institution_name VARCHAR(255),
  access_token_encrypted TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'revoked', 'error')),
  last_synced_at TIMESTAMPTZ,
  error_code VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (consumer_user_id IS NOT NULL AND org_id IS NULL)
    OR (consumer_user_id IS NULL AND org_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_consumer ON plaid_items(consumer_user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_org ON plaid_items(org_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id VARCHAR(128) NOT NULL,
  account_name VARCHAR(255),
  account_mask VARCHAR(8),
  account_type VARCHAR(32),
  account_subtype VARCHAR(32),
  mapped_card_id VARCHAR(128),
  mapping_confidence DECIMAL(4, 3),
  mapping_source VARCHAR(32) NOT NULL DEFAULT 'heuristic',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plaid_item_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_card ON linked_accounts(mapped_card_id)
  WHERE mapped_card_id IS NOT NULL AND is_active = TRUE;
