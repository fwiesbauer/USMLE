import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RevealSchema = z.object({
  question_id: z.string().uuid(),
  selected_answer: z.string().min(1).max(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

  // Verify the quiz is published with this token
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select('id')
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
    .select('correct_answer, explanation, nuggets, cor_loe')
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

  return NextResponse.json({
    correct_answer: question.correct_answer,
    is_correct: isCorrect,
    explanation: question.explanation,
    nuggets: question.nuggets,
    cor_loe: question.cor_loe,
  });
}
