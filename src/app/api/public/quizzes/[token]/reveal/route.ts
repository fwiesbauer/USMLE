import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RevealSchema = z.object({
  question_id: z.string().uuid(),
  selected_answer: z.string().min(1).max(1),
  certainty: z.enum(['certain', 'medium', 'uncertain']).optional(),
  visitor_id: z.string().optional(),
  session_id: z.string().uuid().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

  // Verify the quiz is published with this token
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id, source_reference, doi, pmid, pmcid')
    .eq('share_token', params.token)
    .eq('status', 'published')
    .single();

  if (quizError || !quiz) {
    return NextResponse.json(
      { error: 'Quiz not found or not published' },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = RevealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Fetch the question — verify it belongs to this quiz
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('correct_answer, explanation, nuggets, cor_loe, section')
    .eq('id', parsed.data.question_id)
    .eq('quiz_id', quiz.id)
    .single();

  if (questionError || !question) {
    return NextResponse.json(
      { error: 'Question not found' },
      { status: 404 }
    );
  }

  const isCorrect =
    parsed.data.selected_answer === question.correct_answer;

  // Store the attempt in the database
  const { error: attemptError } = await supabase
    .from('question_attempts')
    .insert({
      question_id: parsed.data.question_id,
      quiz_id: quiz.id,
      visitor_id: parsed.data.visitor_id || null,
      selected_answer: parsed.data.selected_answer,
      is_correct: isCorrect,
      certainty: parsed.data.certainty || null,
      session_id: parsed.data.session_id || null,
    });

  if (attemptError) {
    console.error('Attempt insert error:', attemptError);
  }

  return NextResponse.json({
    correct_answer: question.correct_answer,
    is_correct: isCorrect,
    explanation: question.explanation,
    nuggets: question.nuggets,
    cor_loe: question.cor_loe,
    section: question.section || '',
    source_reference: quiz.source_reference || '',
    doi: quiz.doi || '',
    pmid: quiz.pmid || '',
    pmcid: quiz.pmcid || '',
  });
}
