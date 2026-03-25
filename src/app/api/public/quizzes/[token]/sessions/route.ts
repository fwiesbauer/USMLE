import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SessionSchema = z.object({
  visitor_id: z.string().optional().nullable(),
  total_questions: z.number().int().positive(),
});

// POST — create a new quiz session when the learner starts a quiz
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabase = createServiceClient();

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
  const parsed = SessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: session, error: insertError } = await supabase
    .from('quiz_sessions')
    .insert({
      quiz_id: quiz.id,
      visitor_id: parsed.data.visitor_id || null,
      total_questions: parsed.data.total_questions,
    })
    .select('id')
    .single();

  if (insertError || !session) {
    console.error('Session insert error:', insertError);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }

  return NextResponse.json({ session_id: session.id });
}
