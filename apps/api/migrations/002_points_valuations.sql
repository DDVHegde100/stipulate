-- 002_points_valuations.sql
-- Points program valuation table for cash-equivalent routing

CREATE TABLE IF NOT EXISTS points_programs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  issuer VARCHAR(128) NOT NULL,
  cents_per_point DECIMAL(6, 4) NOT NULL,
  floor_cpp DECIMAL(6, 4),
  ceiling_cpp DECIMAL(6, 4),
  transfer_partners JSONB NOT NULL DEFAULT '[]',
  pools_across_cards BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(32) NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_programs_issuer ON points_programs(issuer);

CREATE TABLE IF NOT EXISTS valuation_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_id VARCHAR(64) NOT NULL REFERENCES points_programs(id) ON DELETE CASCADE,
  cents_per_point DECIMAL(6, 4) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, program_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_valuation_overrides_org ON valuation_overrides(org_id, program_id);

-- Link cards to points programs for routing
ALTER TABLE cards ADD COLUMN IF NOT EXISTS points_program_id VARCHAR(64) REFERENCES points_programs(id);

CREATE INDEX IF NOT EXISTS idx_cards_points_program ON cards(points_program_id);
