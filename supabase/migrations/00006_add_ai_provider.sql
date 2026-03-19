-- Add ai_provider column to educators table
-- Supports: 'anthropic', 'openai', 'google'
ALTER TABLE educators
  ADD COLUMN IF NOT EXISTS ai_provider text NOT NULL DEFAULT 'anthropic';
