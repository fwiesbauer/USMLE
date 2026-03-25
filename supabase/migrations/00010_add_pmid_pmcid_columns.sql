-- Add dedicated PMID and PMCID columns to quizzes table.
-- These identifiers were previously only stored inside the source_metadata JSONB,
-- which meant they could be lost if the best-effort metadata save failed.
-- Mirroring the pattern used for DOI: a dedicated column for reliable persistence.
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS pmid TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS pmcid TEXT;

COMMENT ON COLUMN quizzes.pmid IS 'PubMed identifier (e.g. 12345678)';
COMMENT ON COLUMN quizzes.pmcid IS 'PubMed Central identifier (e.g. PMC12345678)';
