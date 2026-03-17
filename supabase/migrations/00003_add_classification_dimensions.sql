-- Migration: 00003_add_classification_dimensions
-- Adds three classification dimensions to questions:
--   organ_systems, physician_tasks, disciplines
-- Each is a JSONB array of strings (multiple selections allowed).

ALTER TABLE questions
  ADD COLUMN organ_systems JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN physician_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN disciplines JSONB NOT NULL DEFAULT '[]'::jsonb;

-- GIN indexes for future filtering (e.g. "show all questions where organ_systems @> '["Immune System"]'")
CREATE INDEX idx_questions_organ_systems ON questions USING GIN (organ_systems);
CREATE INDEX idx_questions_physician_tasks ON questions USING GIN (physician_tasks);
CREATE INDEX idx_questions_disciplines ON questions USING GIN (disciplines);
