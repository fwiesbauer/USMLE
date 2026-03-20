-- Migration: 00007_add_site_feedback
-- General site feedback from educators (Intercom-style widget)

CREATE TABLE site_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID REFERENCES educators(id) ON DELETE SET NULL,
  page_url TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'question', 'other')),
  message TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_feedback_created_at ON site_feedback(created_at DESC);
CREATE INDEX idx_site_feedback_type ON site_feedback(feedback_type);
CREATE INDEX idx_site_feedback_educator_id ON site_feedback(educator_id);

-- RLS: educators can insert their own feedback
ALTER TABLE site_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_feedback_insert_own" ON site_feedback
  FOR INSERT WITH CHECK (educator_id = auth.uid());
