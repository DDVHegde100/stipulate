-- 011_org_gdpr.sql
-- GDPR data export and scheduled org deletion

CREATE TABLE IF NOT EXISTS org_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  completed_at TIMESTAMPTZ,
  UNIQUE (org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_deletion_scheduled ON org_deletion_requests(status, scheduled_for)
  WHERE status = 'scheduled';
