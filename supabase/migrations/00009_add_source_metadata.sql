-- Add structured bibliographic metadata for uploaded PDFs
-- Stored as JSONB to accommodate the full set of bibliographic fields
-- without requiring individual columns for each.
ALTER TABLE quizzes ADD COLUMN source_metadata JSONB;

-- Add a suggested filename for deduplication and human-readable storage
ALTER TABLE quizzes ADD COLUMN suggested_filename TEXT;

COMMENT ON COLUMN quizzes.source_metadata IS 'Structured bibliographic metadata extracted from uploaded PDF. Fields: article_title, authors (array of {family, given}), journal_title, journal_abbreviation, year, publication_date, volume, issue, pages, doi, pmid, pmcid, issn, keywords (array), document_type (journal_article | manuscript)';
COMMENT ON COLUMN quizzes.suggested_filename IS 'AI-suggested stable filename for the PDF, e.g. "Smith 2024 - Cardiac Outcomes.pdf"';
