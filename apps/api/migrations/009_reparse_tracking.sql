-- 009_reparse_tracking.sql
-- Track benefit guide content hashes and reparse runs

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS last_content_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS last_parsed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS reparse_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cards_checked INTEGER NOT NULL DEFAULT 0,
  cards_changed INTEGER NOT NULL DEFAULT 0,
  cards_failed INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_reparse_runs_started ON reparse_runs(started_at DESC);
