-- 022_consumer_subscriptions.sql
-- Consumer premium subscription state from Stripe

ALTER TABLE consumer_users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(32) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'inactive';

CREATE INDEX IF NOT EXISTS idx_consumer_users_stripe_customer ON consumer_users(stripe_customer_id);
