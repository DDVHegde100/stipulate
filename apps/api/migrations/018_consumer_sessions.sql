-- 018_consumer_sessions.sql
-- Server-side consumer auth sessions (httpOnly cookie)

CREATE TABLE IF NOT EXISTS consumer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID NOT NULL REFERENCES consumer_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumer_sessions_user
  ON consumer_sessions(consumer_user_id);

CREATE INDEX IF NOT EXISTS idx_consumer_sessions_expires
  ON consumer_sessions(expires_at);
