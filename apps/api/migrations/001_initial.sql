-- 001_initial.sql
-- Stipulate core schema v1: issuers, cards, benefits, MCC, API orgs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS issuers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(128) NOT NULL UNIQUE,
  issuer_id UUID REFERENCES issuers(id),
  name VARCHAR(255) NOT NULL,
  network VARCHAR(32) NOT NULL CHECK (network IN ('visa', 'mastercard', 'amex', 'discover')),
  product_tier VARCHAR(64),
  annual_fee_cents INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  benefit_guide_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_issuer ON cards(issuer_id);
CREATE INDEX IF NOT EXISTS idx_cards_network ON cards(network);
CREATE INDEX IF NOT EXISTS idx_cards_active ON cards(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS benefit_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  category VARCHAR(64) NOT NULL,
  multiplier DECIMAL(6, 3) NOT NULL DEFAULT 1.0,
  reward_type VARCHAR(16) NOT NULL DEFAULT 'points' CHECK (reward_type IN ('points', 'cashback', 'miles')),
  cap_amount_cents INTEGER,
  cap_period VARCHAR(32),
  exclusions JSONB NOT NULL DEFAULT '[]',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  source_url TEXT,
  confidence DECIMAL(4, 3) NOT NULL DEFAULT 1.0,
  version INTEGER NOT NULL DEFAULT 1,
  raw_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_benefit_rules_card_category ON benefit_rules(card_id, category);
CREATE INDEX IF NOT EXISTS idx_benefit_rules_effective ON benefit_rules(effective_from, effective_to);

CREATE TABLE IF NOT EXISTS benefit_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, version)
);

CREATE TABLE IF NOT EXISTS merchant_mcc_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_name_normalized VARCHAR(512) NOT NULL,
  mcc CHAR(4) NOT NULL,
  category VARCHAR(64) NOT NULL,
  confidence DECIMAL(4, 3) NOT NULL DEFAULT 0.8,
  source VARCHAR(64) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_mcc_name ON merchant_mcc_mappings USING gin (merchant_name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_merchant_mcc_code ON merchant_mcc_mappings(mcc);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(32) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'payg', 'saas', 'enterprise')),
  stripe_customer_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(16) NOT NULL,
  name VARCHAR(128) NOT NULL DEFAULT 'default',
  scopes JSONB NOT NULL DEFAULT '["route:read", "enrich:read"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS routing_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  request_id VARCHAR(64) NOT NULL,
  mcc CHAR(4),
  amount_cents INTEGER NOT NULL,
  card_count INTEGER NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_requests_org_created ON routing_requests(org_id, created_at DESC);

INSERT INTO issuers (slug, name, website_url) VALUES
  ('chase', 'Chase', 'https://www.chase.com'),
  ('amex', 'American Express', 'https://www.americanexpress.com'),
  ('capital-one', 'Capital One', 'https://www.capitalone.com'),
  ('citi', 'Citi', 'https://www.citi.com'),
  ('discover', 'Discover', 'https://www.discover.com'),
  ('bank-of-america', 'Bank of America', 'https://www.bankofamerica.com'),
  ('wells-fargo', 'Wells Fargo', 'https://www.wellsfargo.com'),
  ('us-bank', 'U.S. Bank', 'https://www.usbank.com')
ON CONFLICT (slug) DO NOTHING;
