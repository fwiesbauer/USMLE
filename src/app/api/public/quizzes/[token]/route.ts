import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('id, title, source_filename, source_reference, doi, pmid, pmcid, question_count_requested, status, share_token')
    .eq('share_token', params.token)
    .eq('status', 'published')
    .single();

  if (error || !quiz) {
    return NextResponse.json(
      { error: 'Quiz not found or not published' },
      { status: 404 }
    );
  }

  // Fetch questions — EXCLUDE correct_answer and explanation
  const { data: questions } = await supabase
    .from('questions')
    .select('id, position, topic, vignette, question_text, options')
    .eq('quiz_id', quiz.id)
    .order('position');

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    source_filename: quiz.source_filename,
    source_reference: quiz.source_reference,
    doi: quiz.doi,
    pmid: quiz.pmid,
    pmcid: quiz.pmcid,
    question_count: questions?.length ?? 0,
    questions: questions ?? [],
  });
}
