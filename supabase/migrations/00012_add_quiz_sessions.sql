-- Track quiz sessions (one per quiz take per visitor)
create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  visitor_id text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_questions int,
  correct_count int,
  score_percent int
);

create index idx_quiz_sessions_quiz on quiz_sessions(quiz_id);
create index idx_quiz_sessions_visitor on quiz_sessions(visitor_id);

alter table quiz_sessions enable row level security;

create policy "Anyone can insert sessions"
  on quiz_sessions for insert
  with check (true);

create policy "Anyone can update sessions"
  on quiz_sessions for update
  using (true);

create policy "Educators can read sessions for own quizzes"
  on quiz_sessions for select
  using (
    quiz_id in (
      select id from quizzes where educator_id = auth.uid()
    )
  );

-- Link attempts to sessions
alter table question_attempts add column session_id uuid references quiz_sessions(id) on delete set null;
create index idx_question_attempts_session on question_attempts(session_id);
