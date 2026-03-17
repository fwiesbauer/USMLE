-- Migration: 00004_add_source_reference
-- Adds a source_reference field to quizzes for formatted bibliographic citation.

ALTER TABLE quizzes
  ADD COLUMN source_reference TEXT;
