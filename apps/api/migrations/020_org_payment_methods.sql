-- 020_org_payment_methods.sql
-- Vault Stripe payment methods per org for repeat proxy-pay

CREATE TABLE IF NOT EXISTS org_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(128) NOT NULL,
  label VARCHAR(128),
  network VARCHAR(32),
  last4 VARCHAR(4),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, stripe_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_org_payment_methods_org ON org_payment_methods(org_id);
