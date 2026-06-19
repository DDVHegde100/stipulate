-- 012_consumer_users.sql
-- Consumer app users for web/mobile auth

CREATE TABLE IF NOT EXISTS consumer_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  wallet_card_ids JSONB NOT NULL DEFAULT '[]',
  notification_prefs JSONB NOT NULL DEFAULT '{"email": true, "push": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumer_users_email ON consumer_users(email);
