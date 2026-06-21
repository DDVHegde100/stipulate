-- 019_card_issuing.sql
-- Card issuing persistence for virtual and physical cards

CREATE TABLE IF NOT EXISTS cardholders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID NOT NULL REFERENCES consumer_users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES card_programs(id),
  external_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  kyc_status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending', 'passed', 'failed', 'review')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (consumer_user_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_cardholders_consumer ON cardholders(consumer_user_id);
CREATE INDEX IF NOT EXISTS idx_cardholders_status ON cardholders(status);

CREATE TABLE IF NOT EXISTS virtual_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cardholder_id UUID NOT NULL REFERENCES cardholders(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES card_programs(id),
  external_id VARCHAR(128),
  last4 VARCHAR(4) NOT NULL,
  network VARCHAR(32) NOT NULL DEFAULT 'visa',
  status VARCHAR(32) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  pan_token VARCHAR(255),
  cvv_token VARCHAR(255),
  exp_month SMALLINT,
  exp_year SMALLINT,
  spend_limit_minor INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_virtual_cards_cardholder ON virtual_cards(cardholder_id);
CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON virtual_cards(status);

CREATE TABLE IF NOT EXISTS physical_card_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cardholder_id UUID NOT NULL REFERENCES cardholders(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES card_programs(id),
  external_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB NOT NULL DEFAULT '{}',
  tracking_number VARCHAR(128),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_card_orders_cardholder ON physical_card_orders(cardholder_id);
