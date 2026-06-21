-- 023_lithic_marqeta_programs.sql
-- Draft card programs for alternate processors

INSERT INTO card_programs (slug, name, processor, status, metadata)
VALUES
  ('lithic_sandbox', 'Lithic Sandbox', 'lithic', 'draft', '{"env":"sandbox"}'::jsonb),
  ('marqeta_sandbox', 'Marqeta Sandbox', 'marqeta', 'draft', '{"env":"sandbox"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
