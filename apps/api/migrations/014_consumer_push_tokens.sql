-- 014_consumer_push_tokens.sql
-- Expo push tokens for mobile benefit alerts

ALTER TABLE consumer_users
  ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_consumer_users_push_token
  ON consumer_users (expo_push_token)
  WHERE expo_push_token IS NOT NULL;
