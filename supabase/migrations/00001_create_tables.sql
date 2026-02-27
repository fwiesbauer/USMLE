-- QuizForge database schema
-- Migration: 00001_create_tables

-- Educators table (extends Supabase auth.users)
CREATE TABLE educators (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  anthropic_api_key_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id UUID NOT NULL REFERENCES educators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_filename TEXT,
  source_text TEXT,
  pdf_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  share_token TEXT UNIQUE,
  question_count_requested INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  position INT NOT NULL,
  topic TEXT NOT NULL,
  section TEXT,
  cor_loe TEXT,
  vignette TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  nuggets JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quizzes_educator_id ON quizzes(educator_id);
CREATE INDEX idx_quizzes_share_token ON quizzes(share_token);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_position ON questions(quiz_id, position);

-- Row Level Security
ALTER TABLE educators ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Educators: users can only access their own row
CREATE POLICY "educators_select_own" ON educators
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "educators_insert_own" ON educators
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "educators_update_own" ON educators
  FOR UPDATE USING (auth.uid() = id);

-- Quizzes: educators can CRUD their own quizzes
CREATE POLICY "quizzes_select_own" ON quizzes
  FOR SELECT USING (educator_id = auth.uid());

CREATE POLICY "quizzes_insert_own" ON quizzes
  FOR INSERT WITH CHECK (educator_id = auth.uid());

CREATE POLICY "quizzes_update_own" ON quizzes
  FOR UPDATE USING (educator_id = auth.uid());

CREATE POLICY "quizzes_delete_own" ON quizzes
  FOR DELETE USING (educator_id = auth.uid());

-- Questions: educators can CRUD questions for their own quizzes
CREATE POLICY "questions_select_own" ON questions
  FOR SELECT USING (
    quiz_id IN (SELECT id FROM quizzes WHERE educator_id = auth.uid())
  );

CREATE POLICY "questions_insert_own" ON questions
  FOR INSERT WITH CHECK (
    quiz_id IN (SELECT id FROM quizzes WHERE educator_id = auth.uid())
  );

CREATE POLICY "questions_update_own" ON questions
  FOR UPDATE USING (
    quiz_id IN (SELECT id FROM quizzes WHERE educator_id = auth.uid())
  );

CREATE POLICY "questions_delete_own" ON questions
  FOR DELETE USING (
    quiz_id IN (SELECT id FROM quizzes WHERE educator_id = auth.uid())
  );
