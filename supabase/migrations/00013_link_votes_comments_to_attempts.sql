-- Link votes and comments to the specific attempt they were made on.
-- This lets us build a single-row-per-attempt view that includes
-- correctness, certainty, vote, and whether a comment was left.

alter table question_votes
  add column attempt_id uuid references question_attempts(id) on delete set null;

alter table question_comments
  add column attempt_id uuid references question_attempts(id) on delete set null;

create index idx_question_votes_attempt on question_votes(attempt_id);
create index idx_question_comments_attempt on question_comments(attempt_id);
