import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CompleteSchema = z.object({
  correct_count: z.number().int().min(0),
  total_questions: z.number().int().positive(),
  score_percent: z.number().int().min(0).max(100),
});

// PATCH — mark a quiz session as completed with final score
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string; sessionId: string } }
) {
  const supabase = createServiceClient();

  // Verify quiz exists and is published
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
  const parsed = CompleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from('quiz_sessions')
    .update({
      completed_at: new Date().toISOString(),
      correct_count: parsed.data.correct_count,
      total_questions: parsed.data.total_questions,
      score_percent: parsed.data.score_percent,
    })
    .eq('id', params.sessionId)
    .eq('quiz_id', quiz.id);

  if (updateError) {
    console.error('Session complete error:', updateError);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
