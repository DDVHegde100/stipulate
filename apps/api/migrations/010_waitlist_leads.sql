-- 010_waitlist_leads.sql
-- Marketing waitlist capture

CREATE TABLE IF NOT EXISTS waitlist_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(320) NOT NULL,
  company VARCHAR(256),
  source VARCHAR(64) NOT NULL DEFAULT 'web',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist_leads(created_at DESC);
