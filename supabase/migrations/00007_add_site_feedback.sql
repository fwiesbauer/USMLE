-- Migration: 00007_add_site_feedback
-- General site feedback from learners (Intercom-style widget)

CREATE TABLE site_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'suggestion', 'question', 'other')),
  message TEXT NOT NULL,
  email TEXT,
  visitor_id TEXT,
  quiz_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_feedback_created_at ON site_feedback(created_at DESC);
CREATE INDEX idx_site_feedback_type ON site_feedback(feedback_type);
