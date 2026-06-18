-- 006_platform_auth_metering.sql
-- Org-scoped API keys, usage metering, webhook delivery enhancements

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  api_key_id UUID REFERENCES api_keys(id),
  event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('route', 'enrich', 'batch_route')),
  request_id VARCHAR(64) NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  cost_micros INTEGER NOT NULL DEFAULT 1000,
  latency_ms INTEGER,
  status VARCHAR(16) NOT NULL DEFAULT 'success',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_org_created ON usage_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type, created_at DESC);

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute INTEGER NOT NULL DEFAULT 60;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS monthly_request_limit INTEGER;

ALTER TABLE webhook_subscriptions
  ADD COLUMN IF NOT EXISTS signing_secret_hash VARCHAR(128);

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}';

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

ALTER TABLE webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_event_id_fkey;

ALTER TABLE webhook_deliveries
  ALTER COLUMN event_id TYPE VARCHAR(64) USING event_id::text;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(status, next_retry_at)
  WHERE status IN ('pending', 'failed');
INSERT INTO organizations (slug, name, plan, monthly_request_limit)
VALUES ('stipulate-dev', 'Stipulate Development', 'saas', NULL)
ON CONFLICT (slug) DO NOTHING;
