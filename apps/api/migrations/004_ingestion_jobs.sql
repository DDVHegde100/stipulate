-- 004_ingestion_jobs.sql
-- Admin ingestion pipeline job queue

CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id VARCHAR(128) NOT NULL,
  source_url TEXT NOT NULL,
  source_format VARCHAR(16) NOT NULL DEFAULT 'html' CHECK (source_format IN ('pdf', 'html', 'markdown', 'plain_text')),
  status VARCHAR(32) NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'extracting', 'parsing', 'review', 'approved', 'rejected', 'published', 'failed'
  )),
  priority INTEGER NOT NULL DEFAULT 0,
  content_hash VARCHAR(64),
  extraction_result JSONB,
  parse_result JSONB,
  normalized_rules JSONB,
  confidence DECIMAL(4, 3),
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_notes TEXT,
  reviewed_by VARCHAR(128),
  reviewed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_card ON ingestion_jobs(card_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_review ON ingestion_jobs(status) WHERE status = 'review';

CREATE TABLE IF NOT EXISTS ingestion_job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES ingestion_jobs(id) ON DELETE CASCADE,
  from_status VARCHAR(32),
  to_status VARCHAR(32) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_events_job ON ingestion_job_events(job_id, created_at DESC);
