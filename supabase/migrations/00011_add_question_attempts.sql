-- Store learner answer attempts with optional certainty level
create table if not exists question_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  visitor_id text,                              -- browser fingerprint (nullable for anonymous)
  selected_answer text not null,
  is_correct boolean not null,
  certainty text check (certainty in ('certain', 'medium', 'uncertain')),
  created_at timestamptz not null default now()
);

-- Index for querying attempts by quiz or question
create index idx_question_attempts_quiz on question_attempts(quiz_id);
create index idx_question_attempts_question on question_attempts(question_id);
create index idx_question_attempts_visitor on question_attempts(visitor_id);

-- Allow public inserts (anonymous quiz takers) and reads for educators
alter table question_attempts enable row level security;

-- Anyone can insert attempts (public quiz flow uses service role, but be explicit)
create policy "Anyone can insert attempts"
  on question_attempts for insert
  with check (true);

-- Educators can read attempts for their own quizzes
create policy "Educators can read attempts for own quizzes"
  on question_attempts for select
  using (
    quiz_id in (
      select id from quizzes where educator_id = auth.uid()
    )
  );
