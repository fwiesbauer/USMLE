import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get question IDs for this quiz
  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .eq('quiz_id', params.id);

  if (!questions || questions.length === 0) {
    return NextResponse.json({});
  }

  const questionIds = questions.map((q) => q.id);

  // Get all votes for these questions
  const { data: votes } = await supabase
    .from('question_votes')
    .select('question_id, vote')
    .in('question_id', questionIds);

  // Get comment counts for these questions
  const { data: comments } = await supabase
    .from('question_comments')
    .select('question_id')
    .in('question_id', questionIds);

  // Aggregate
  const feedback: Record<string, { thumbs_up: number; thumbs_down: number; comment_count: number }> = {};

  for (const qid of questionIds) {
    feedback[qid] = { thumbs_up: 0, thumbs_down: 0, comment_count: 0 };
  }

  for (const v of votes ?? []) {
    if (v.vote === 1) feedback[v.question_id].thumbs_up++;
    else if (v.vote === -1) feedback[v.question_id].thumbs_down++;
  }

  for (const c of comments ?? []) {
    feedback[c.question_id].comment_count++;
  }

  return NextResponse.json(feedback);
}
