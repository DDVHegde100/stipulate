-- 021_stripe_subscription_item.sql
-- Store Stripe subscription item ID for metered usage reporting

ALTER TABLE billing_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_billing_subs_item ON billing_subscriptions(stripe_subscription_item_id);
