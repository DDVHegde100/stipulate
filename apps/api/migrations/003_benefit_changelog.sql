-- 003_benefit_changelog.sql
-- Changelog events table for webhook delivery tracking

CREATE TABLE IF NOT EXISTS benefit_changelog_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  previous_version INTEGER,
  event_type VARCHAR(64) NOT NULL CHECK (event_type IN (
    'benefit.created', 'benefit.updated', 'benefit.removed',
    'benefit.version_published', 'catalog.refresh_completed'
  )),
  severity VARCHAR(16) NOT NULL DEFAULT 'material' CHECK (severity IN ('breaking', 'material', 'minor')),
  change_summary TEXT NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]',
  effective_from DATE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  webhook_delivered_at TIMESTAMPTZ,
  UNIQUE (card_id, version, event_type)
);

CREATE INDEX IF NOT EXISTS idx_changelog_events_published ON benefit_changelog_events(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_changelog_events_card ON benefit_changelog_events(card_id, version DESC);

-- Webhook subscriptions for B2B integrators
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret_hash VARCHAR(128) NOT NULL,
  events JSONB NOT NULL DEFAULT '["benefit.updated", "benefit.version_published"]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_subs_org ON webhook_subscriptions(org_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES benefit_changelog_events(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending ON webhook_deliveries(status) WHERE status = 'pending';
