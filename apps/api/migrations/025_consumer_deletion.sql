-- 025_consumer_deletion.sql
-- GDPR scheduled consumer account deletion

CREATE TABLE IF NOT EXISTS consumer_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_user_id UUID NOT NULL REFERENCES consumer_users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  completed_at TIMESTAMPTZ,
  UNIQUE (consumer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_consumer_deletion_scheduled ON consumer_deletion_requests(status, scheduled_for)
  WHERE status = 'scheduled';
