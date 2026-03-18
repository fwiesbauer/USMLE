-- Add DOI field to quizzes for linking to source publications
ALTER TABLE quizzes ADD COLUMN doi TEXT;

-- Table for student comments on questions
CREATE TABLE question_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  commenter_name TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_question_comments_question_id ON question_comments(question_id);

-- Table for thumbs up/down votes on questions
-- visitor_id is a browser fingerprint (stored in localStorage) to prevent duplicate votes
CREATE TABLE question_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, visitor_id)
);

CREATE INDEX idx_question_votes_question_id ON question_votes(question_id);
